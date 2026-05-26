import { flashModel } from "./models";
import { SYSTEM_PROMPT } from "./prompts";

export async function generateText(input: string) {
  const prompt = `
${SYSTEM_PROMPT}

User Question:
${input}
`;

  const result = await flashModel.generateContent(prompt);

  return result.response.text();
}