import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getTutorHint = async (
  currentAtoms: { symbol: string; count: number }[],
  targetReaction: string | null,
  ageLevel: string = "14"
) => {
  const prompt = `
    You are an AI Chemistry Tutor for students aged 11-17.
    Current state of the virtual lab:
    - Atoms in reaction zone: ${currentAtoms.map(a => `${a.count}x ${a.symbol}`).join(", ") || "None"}
    - Target goal: ${targetReaction || "Free exploration"}
    - Student age: ${ageLevel}

    Provide a short, encouraging, and scientifically accurate hint or explanation. 
    If they are close to a reaction, guide them. 
    If they are stuck, suggest an element to add.
    Keep it under 3 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Tutor Error:", error);
    return "Keep experimenting! Try combining different elements to see what happens.";
  }
};
