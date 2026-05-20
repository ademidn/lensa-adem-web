import { genAI } from "./client";

export const flashModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});