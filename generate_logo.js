import { GoogleGenAI } from "@google/genai";

async function generateLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: "A high-quality, professional app icon for a software named 'Manage-Me'. The design features a vibrant purple square with rounded corners (iOS style). In the center, there is a clean, bold, white letter 'M'. The style is minimalist, modern, and flat design, with a very subtle gradient on the purple background. 1024x1024 resolution, sharp edges, no text other than the letter M, centered perfectly.",
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      console.log('IMAGE_DATA:' + part.inlineData.data);
    }
  }
}

generateLogo();
