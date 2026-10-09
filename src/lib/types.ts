import { z } from "zod";

// Schema de uma única mensagem de chat: deve ter uma role ("user", "assistant") e content do tipo string
export const chatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
});

// Schema do body da request enviada para POST /api/chat
// Espera um objeto com uma array "messages" com no mínimo 1 ChatMessage
export const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1, "Messages are required")
});

// Tipos TypeScript inferidos a partir dos schemas zod
// Isso garante que os tipos estáticos e a validação runtime estejam sincronizados
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>

// Tipos de Evento SSE - Server Sent Events
// Representam os três formatos de possível dados que o backend envia por
// Stream para o frontend.
// Usar uma descriminated union permite que tanto o produtor (route.ts) quanto o
// consumidor (geralmente um custom hook use-something.ts) façam o narrowing seguro
// com checks "key" no dado.

// Um trecho de texto transmitido pelo AI agent (enviado conforme os tokens chegam)
export type SSETextEvent = { text: string };

// Sinaliza que o agent terminou de gerar sua resposta completa
export type SSEDoneEvent = { done: true };

// Enviado quando ocorre um erro durante o streaming (ex. falha de rede, falha do agent, etc.)
export type SSEErrorEvent = { error: string };

// Union de todos os payload SSE possíveis. O frontend faz parse de cada linha "data:" do stream event
// e tipifica como SSEEvent, depois faz narrowing com o operador "in"
export type SSEEvent = SSETextEvent | SSEDoneEvent | SSEErrorEvent;

// API Error Response
export type ApiErrorResponse = { error: string };