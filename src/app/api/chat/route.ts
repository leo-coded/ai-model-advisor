import { createAgent } from "@/lib/agents";
import { ApiErrorResponse, chatRequestSchema, SSEEvent } from "@/lib/types";
import { Message, TextBlock } from "@strands-agents/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = chatRequestSchema.safeParse(body);

        if(!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Invalid request body" } satisfies ApiErrorResponse,
                { status: 400 }
            );
        }

        const { messages } = parsed.data;
        const agent = createAgent();
        const conversationHistory = messages.slice(0, -1);

        for (const msg of conversationHistory) {
            agent.messages.push(
                new Message({
                    role: msg.role,
                    content: [new TextBlock(msg.content)],
                })
            );
        }

        const latestMessage = messages[messages.length - 1].content;
        const encoder = new TextEncoder();
        
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    for await ( const event of agent.stream(latestMessage) ) {
                        if (
                            event.type === "modelStreamUpdateEvent" &&
                            event.event.type === "modelContentBlockDeltaEvent" &&
                            event.event.delta.type === "textDelta"
                        ) {
                            const text = event.event.delta.text;
                            const payload: SSEEvent = { text };
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                            );
                        }
                    }

                    const donePayload: SSEEvent = { done: true };
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`)
                    );

                    controller.close();

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
                    const errorPayload: SSEEvent = { error: errorMessage };
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`)
                    );
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return NextResponse.json(
            { error: errorMessage } satisfies ApiErrorResponse,
            { status: 500 }
        );
    }
}