import Groq from "groq-sdk";
import { ZUNA_SYSTEM_PROMPT } from "../data/knowledgeBase";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const groq = new Groq({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true, // Required for Vite / React client-side usage
});
