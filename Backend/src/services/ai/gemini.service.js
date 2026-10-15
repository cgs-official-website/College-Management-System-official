import { logger } from '../../lib/logger.js';

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

async function callGemini(modelName, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini ${modelName} returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error(`Empty response from ${modelName}`);
  }
  return JSON.parse(candidateText.trim());
}

/**
 * Generate role-tailored dashboard insights using Google Gemini AI.
 *
 * @param {Object} options
 * @param {string} options.roleName - Name of the user's role (e.g. "Hostel Manager", "Admin", "Librarian")
 * @param {string} options.userName - Name of the user
 * @param {string} options.collegeName - Name of the institution
 * @param {Array<string>} options.accessibleModules - Modules the user has read permissions for
 * @param {Object} options.metrics - Aggregated metric data for accessible modules
 * @returns {Promise<{ summary: string, recommendations: Array<string>, generatedAt: string, model?: string, fallback?: boolean }>}
 */
export async function generateRoleInsights({
  roleName = 'Administrator',
  userName = 'User',
  collegeName = 'Institution',
  accessibleModules = [],
  metrics = {}
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallback(roleName, accessibleModules, metrics);
  }

  const prompt = `You write short task notes for staff on a college ERP dashboard.
Role: ${roleName}
Institution: ${collegeName}
Modules this role can access: ${accessibleModules.join(', ')}

Data:
${JSON.stringify(metrics)}

Rules:
- Use only the data above. Never invent numbers.
- Do not repeat totals that are already shown as cards (enrollment, staff count, capacity).
- Write plain, direct sentences. No greetings, no "leveraging", "streamline", "ensure smooth".
- Give 2 to 4 items. Each must be a specific action tied to a module from the list.
- Each item is under 15 words.
- If a module has no data, say it needs setup, in one short item.
Return only JSON:
{"items":[{"text":"...","module":"one of the permitted modules"}]}`;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const parsed = await callGemini(model, prompt, apiKey);
      const items = (Array.isArray(parsed.items) ? parsed.items : [])
        .filter(i => i?.text && accessibleModules.includes(i.module))
        .slice(0, 4);
      if (items.length) {
        return { items, generatedAt: new Date().toISOString(), model };
      }
    } catch (err) {
      logger.warn(`[GeminiService] Model ${model} failed: ${err.message}`);
    }
  }
  return buildFallback(roleName, accessibleModules, metrics);
}

// Deterministic fallback: no AI, built from real numbers
function buildFallback(roleName, accessibleModules, metrics) {
  const items = [];
  // Example: adapt keys to your real metrics object
  if (accessibleModules.includes('students') && metrics.students?.incompleteRecords > 0) {
    items.push({ text: `${metrics.students.incompleteRecords} student records are incomplete`, module: 'students' });
  }
  if (accessibleModules.includes('hostel') && metrics.hostel?.vacantBeds >= 0) {
    items.push({ text: `${metrics.hostel.vacantBeds} hostel beds are vacant`, module: 'hostel' });
  }
  return { items, generatedAt: new Date().toISOString(), fallback: true };
}
