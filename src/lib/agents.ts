import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

// Cria e retorna um Strands Agent.
export function createAgent() {

    const SYSTEM_PROMPT = `
    
    `

    const model = new OpenAIModel({
        api: "chat",
        apiKey: process.env.API_KEY || "",
        clientConfig: {
            baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
        },
        modelId: process.env.LLM_MODEL_ID || "openai/gpt-oss-20b",
        temperature: 0.7,
        maxTokens: 4096,
    });




    const agent = new Agent({
        model,
        //... tools, systemPrompt
    });

    return agent;
}