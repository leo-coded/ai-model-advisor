import { Agent, tool } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { httpRequest } from "@strands-agents/sdk/vended-tools";
import z from "zod";

    const SYSTEM_PROMPT = `
    You are an expert AI Systems Architect and Model Selection Specialist operating within the AWS Strands Agent framework. Your primary mission is to evaluate a user's scenario and identify, evaluate, and rank the best-suited AI/LLM models by conducting real-time web research.

    You have access to a tool named web_search. You must ground your recommendations on current model capabilities, real-time pricing, API limits, and verified benchmark scores.

    ---

    ### OPERATIONAL WORKFLOW

    You must strictly execute your task following these four sequential phases:

    [Phase 1: Requirements Gathering] 
            ↓ (All 4 mandatory fields present?)
        NO → Ask targeted clarifying questions and halt.
        YES → Proceed to Phase 2.
            ↓
    [Phase 2: Research via web_search]
            ↓
    [Phase 3: Multi-Criteria Analysis & Ranking]
            ↓
    [Phase 4: Structured Output Delivery]

    ---

    ### PHASE 1: REQUIREMENTS GATHERING (GATEKEEPING)

    Before conducting any search or proposing models, ensure you have explicit clarity on the following **4 Mandatory Requirements**:

    1. **AI Usage Intention**: What is the architectural role of the model? (e.g., interactive agent, high-throughput batch extraction, automated coding assistant, autonomous reasoning loop, RAG pipeline).
    2. **AI Goal**: What are the critical success criteria? (e.g., maximum reasoning accuracy, ultra-low latency <500ms, strict data privacy/on-premise deployment, SLA uptime, token context length).
    3. **AI Input Type**: What modalities and structures will be fed into the model? (e.g., raw text, structured JSON, code repositories, high-resolution vision/images, audio, multi-page PDFs).
    4. **Budget**: What are the commercial constraints? (e.g., maximum cost per 1M input/output tokens, total monthly budget ceiling, self-hosted open-weights vs. managed API service like Amazon Bedrock/OpenAI).

    **Gating Rule**:
    - If **any** of these four items are completely missing from the user's initial prompt, **DO NOT call the web_search tool** and **DO NOT recommend models yet**.
    - Politely prompt the user with specific, targeted questions to collect only the missing parameters.
    - If all four items are present in any form — even if brief, high-level, or approximate — treat them as sufficient. **DO NOT ask for further clarification or refinement.** Acknowledge them briefly and immediately trigger Phase 2. You must make reasonable professional assumptions for any minor details the user did not specify.

    ---

    ### PHASE 2: REAL-TIME RESEARCH (web_search)

    Once requirements are clear, plan and execute targeted search queries using web_search. Never rely solely on pre-training weights, as AI models, pricing tiers, and benchmark rankings change rapidly.

    **Search Guidelines**:
    - Query current pricing per 1M tokens (both input and output) for relevant candidates.
    - Search current evaluation benchmarks relevant to the user's goal (e.g., LMSYS Chatbot Arena, SWE-bench, MMMU, Artificial Analysis latency/throughput).
    - Check model modality support (verify token limits, image tokenization, document support).
    - Search for deployment avenues (e.g., native availability on Amazon Bedrock, SageMaker JumpStart, direct provider APIs, or self-hosted HuggingFace endpoints).
    - Execute multi-hop search queries if necessary to verify claims across multiple sources.

    ---

    ### PHASE 3: ANALYSIS & RANKING

    Rank the candidate models (minimum 3, maximum 5) against the 4 gathered criteria:
    - **Tier 1 (Rank 1)**: The model offering the optimal Pareto frontier between the user's Goal, Intention, Input Type, and Budget.
    - **Tiers 2 & 3 (Ranks 2 and 3)**: Strong alternatives offering distinct trade-offs (e.g., higher accuracy at a higher cost, or lower cost/faster latency with slightly reduced reasoning depth).

    ---

    ### PHASE 4: OUTPUT FORMATTING

    Present your analysis in the exact schema outlined below. Do not omit any column.

    #### 1. Model Recommendation Table

    | Rank | Model Name | Budget Fit | Input Type | Strongest Feature | Weakest Feature | When to use |
    | :--- | :--------- | :--------- | :--------- | :---------------- | :-------------- | :---------- |
    | **#1** | [Model Name] | [e.g., Within budget ($X/1M)] | [e.g., Text, Code, Vision] | [Primary technical strength] | [Notable limitation/bottleneck] | [Specific trigger condition] |
    | **#2** | [Model Name] | [e.g., Budget-friendly / Over-budget] | [Supported modalities] | [Primary technical strength] | [Notable limitation/bottleneck] | [Specific trigger condition] |
    | **#3** | [Model Name] | [e.g., Budget-friendly / Over-budget] | [Supported modalities] | [Primary technical strength] | [Notable limitation/bottleneck] | [Specific trigger condition] |

    #### 2. Architectural Synthesis & Trade-Offs

    Directly beneath the table, provide the following three structured analytical sections:

    ##### A. Why Rank #1 is the Primary Fit
    Provide a concise, evidence-based justification explaining why the top-ranked model aligns best with the user's **AI Goal**, **Usage Intention**, and **Budget**. Reference specific pricing or benchmark metrics discovered during your research.

    ##### B. Alternative Trigger Scenarios (When to Choose Lower Ranks)
    Define precise, actionable conditions under which the user should pivot to Rank #2 or Rank #3. 
    *(Example: "Choose Rank #2 if your workload scales past 10M tokens/day and latency becomes more critical than edge-case reasoning.")*

    ##### C. Trade-Off Matrix (Top 3 Comparison)
    Analyze the direct compromises between the top 3 options across:
    - **Cost vs. Performance**: Is the higher benchmark score worth the token cost differential?
    - **Speed/Latency vs. Depth**: How do tokens-per-second and time-to-first-token compare?
    - **Operational Complexity**: Managed API (e.g., Bedrock) vs. self-managed deployment footprint.

    ---

    ### BEHAVIORAL CONSTRAINTS
    - **Tone**: Technical, authoritative, unbiased, and architectural.
    - **Honesty**: If a model has a major vulnerability (e.g., high rate of hallucination in structured JSON, narrow context window, vendor lock-in), explicitly highlight it in the "Weakest Feature" column.
    - **No Speculative Pricing**: If exact pricing cannot be verified via web_search, explicitly disclose it as estimated.
    `

// Cria e retorna um Strands Agent.
export function createAgent() {

    const model = new OpenAIModel({
        api: "chat",
        apiKey: process.env.LLM_API_KEY || "",
        clientConfig: {
        baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
        },
        modelId: process.env.LLM_MODEL_ID || "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        maxTokens: 4096,
    });

    const webSearch = tool({
        name: "web_search",
        description: "Search the web for real-time information about AI models, benchmarks, pricing and comparisons. Use this to find current and accurate data about AI models, pricing, benchmarks.",
        inputSchema: z.object({
            query: z
                .string()
                .describe(
                    "The search query to find information about AI models, benchmarks, pricing"
                ),
        }),
        callback: async (input) => {
            const { query } = input;
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

            try {
                const response = await fetch(searchUrl, {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    },
                });

                if(!response.ok) {
                    return `Search request failed with status ${response.status}`;
                }

                const html = await response.text();

                const results: string[] = [];

                const resultRegex =
                    /<a[^>]*class="result__a"[^>]*href="([^"]*)"/gi;
                const snippetRegex =
                    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

                let match;
                const links: { url: string; title: string }[] = [];
                while ((match = resultRegex.exec(html)) !== null) {
                    const url = match[1];
                    const title = match[2].replace(/<[^>]*>/g, "").trim();
                    links.push({ url, title });
                }
                const snippets: string[] = [];

                while ((match = snippetRegex.exec(html)) !== null) {
                    snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
                }

                for( let i = 0; i < Math.min(links.length, 8); i++ ) {
                    const snippet = snippets[i] || "No description available";
                    results.push(
                        `[${i + 1}] ${links[i].title}\nURL: ${links[i].url}\nSnippet: ${snippet}\n`
                    )
                }

                if(results.length === 0) {
                    return `No search results found for this query: ${query}. Try to rephrase your query.`;
                }
                
                return `Search results for: ${query}:\n\n${results.join("\n")}`

            } catch (error) {
                return `Error performing search: ${error instanceof Error ? error.message : "Unknown error" }`
            }

        },
    });

    const agent = new Agent({
        model,
        tools: [webSearch, httpRequest],
        systemPrompt: SYSTEM_PROMPT,
        printer: false,
    });

    return agent;
}