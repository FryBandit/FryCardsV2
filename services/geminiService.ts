
import { GoogleGenAI, Type } from "@google/genai";
import { CardType, CardData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getResponseSchema = (cardType: CardType) => {
    const baseProperties = {
        name: { type: Type.STRING, description: 'A compelling and unique name for the card.' },
        description: { type: Type.STRING, description: 'A short, flavorful text that tells a story or describes the card.' },
    };

    if (cardType === CardType.Unit) {
        return {
            type: Type.OBJECT,
            properties: {
                ...baseProperties,
                attack: { type: Type.INTEGER, description: 'A number between 1 and 10 representing the unit\'s attack power.' },
                health: { type: Type.INTEGER, description: 'A number between 1 and 10 representing the unit\'s health.' },
            },
            required: ['name', 'description', 'attack', 'health'],
        };
    }

    return {
        type: Type.OBJECT,
        properties: {
            ...baseProperties,
            effect: { type: Type.STRING, description: 'A detailed description of the card\'s special ability or effect.' },
        },
        required: ['name', 'description', 'effect'],
    };
};

export const generateCardData = async (cardType: CardType): Promise<Omit<CardData, 'imageUrl'>> => {
    try {
        const prompt = `You are a creative game designer for a new trading card game called "Aetherium Chronicles".
        Generate a unique '${cardType}' card with a dark fantasy theme. Be creative, evocative, and consistent with the theme.
        Provide the response as a JSON object that strictly follows the provided schema.`;

        const responseSchema = getResponseSchema(cardType);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);

        return { ...parsedData, type: cardType };
    } catch (error) {
        console.error('Error generating card data:', error);
        throw new Error('Failed to generate card data from Gemini API.');
    }
};

export const generateCardImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '3:4',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error('No image was generated.');
    } catch (error) {
        console.error('Error generating card image:', error);
        throw new Error('Failed to generate card image from Gemini API.');
    }
};
