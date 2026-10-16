import { callOllama } from '../ai/ollamaClient.js';
import { logAudit } from '../services/auditService.js';
import { HttpError } from '../utils/httpError.js';

const EMS_SYSTEM_PROMPT = `You are an on-device EMS Clinical Protocol and Decision Support Assistant running locally on the emergency response CAD platform.
You assist emergency medical technicians, paramedics, and emergency dispatchers with evidence-based pre-hospital triage, pharmacology, trauma resuscitation, and clinical protocols.

Guidelines:
1. Respond accurately, clearly, and concisely using standard EMS terminology.
2. For natural conversation (e.g. greetings, questions about your capabilities), respond naturally, warmly, and professionally.
3. For clinical queries:
   - Prioritize life threats: Airway, Breathing, Circulation (ABC / C-ABC).
   - Provide standard adult and pediatric dosages when appropriate (e.g., Epinephrine 1:1,000 0.3-0.5 mg IM for anaphylaxis; Aspirin 324 mg PO chewed for suspected ACS; Albuterol 2.5 mg neb for bronchospasm).
   - Highlight rapid transport criteria, critical red flags, and contraindications.
4. Format responses cleanly with structured markdown (bullet points, bold key terms) so paramedics can scan them rapidly on Mobile Data Terminals (MDTs).
5. Always maintain a professional, calm, and reassuring tone.
6. Never fabricate medical recommendations or non-existent pharmaceuticals. If a scenario requires orders outside standard field protocols, advise contacting online Medical Direction.`;

export async function queryAssistant(req, res, next) {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new HttpError(400, 'INVALID_INPUT', 'Field "message" must be a non-empty string.');
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      throw new HttpError(400, 'MESSAGE_TOO_LONG', 'Message must be under 2000 characters.');
    }

    // Build context prompt with up to 6 recent conversation turns if provided
    let contextPrompt = '';
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentHistory = conversationHistory
        .slice(-6)
        .filter((item) => item && item.sender && item.text)
        .map((item) => `${item.sender === 'user' ? 'Paramedic/Responder' : 'EMS Assistant'}: ${item.text}`)
        .join('\n\n');

      if (recentHistory) {
        contextPrompt = `Previous Conversation Context:\n${recentHistory}\n\n`;
      }
    }

    const prompt = `${contextPrompt}Current Field Query: ${trimmedMessage}\n\nEMS Decision Support Response:`;

    const start = Date.now();
    const modelToUse = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const { rawOutput, model, totalDurationMs } = await callOllama({
      prompt,
      systemPrompt: EMS_SYSTEM_PROMPT,
      format: null,
      model: modelToUse,
      temperature: 0.2,
    });

    const latencyMs = totalDurationMs || Date.now() - start;

    // Log tamper-evident audit record (excluding raw medical query text for privacy)
    await logAudit({
      req,
      action: 'ai_assistant.query',
      resourceType: 'assistant',
      details: {
        messageLength: trimmedMessage.length,
        replyLength: rawOutput ? rawOutput.length : 0,
        model: model || modelToUse,
        generationMs: latencyMs,
      },
    });

    const payload = {
      reply: rawOutput,
      model: model || modelToUse,
      generationMs: latencyMs,
    };

    res.json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (err) {
    next(err);
  }
}
