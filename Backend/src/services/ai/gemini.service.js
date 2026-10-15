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
    return {
      summary: `Welcome to your ${roleName} dashboard. Operational metrics for your assigned modules (${accessibleModules.join(', ') || 'assigned areas'}) are up to date.`,
      recommendations: ['Review pending operational tickets.', 'Ensure regular data synchronization.'],
      generatedAt: new Date().toISOString(),
      fallback: true,
    };
  }

  const prompt = `You are the AI Operations Intelligence Assistant for a college ERP system.
User: ${userName}
Role: ${roleName}
Institution: ${collegeName}
Permitted Modules: ${accessibleModules.join(', ')}

Current Real-time System Metrics:
${JSON.stringify(metrics, null, 2)}

Instructions:
1. Provide a sharp, role-specific executive briefing (2-3 sentences max).
2. Highlight any notable metric, capacity, or key operational status.
3. Suggest 2-3 brief, concrete, actionable next steps or priorities for this role today.
4. If numbers are 0 or empty, suggest initial setup or monitoring.
5. Return strictly valid JSON in this format:
{
  "summary": "Short 2-3 sentence executive briefing here.",
  "recommendations": ["Action item 1", "Action item 2"]
}
Do NOT include markdown backticks like \`\`\`json. Output ONLY the JSON object.`;

  // Try primary model first, fallback to secondary model on failure
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const parsed = await callGemini(model, prompt, apiKey);
      return {
        summary: parsed.summary || `Operational metrics for ${roleName} loaded.`,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        generatedAt: new Date().toISOString(),
        model,
      };
    } catch (err) {
      logger.warn(`[GeminiService] Model ${model} failed: ${err.message}`);
    }
  }

  // Graceful fallback if both models encounter errors
  return {
    summary: `Welcome back. Your ${roleName} workspace is active with access to ${accessibleModules.length} assigned module(s).`,
    recommendations: [
      'Check assigned module dashboards for recent records.',
      'Address pending approval requests or urgent updates.'
    ],
    generatedAt: new Date().toISOString(),
    fallback: true,
  };
}
