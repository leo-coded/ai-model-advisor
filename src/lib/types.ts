import { z } from "zod";

export const chatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
})
