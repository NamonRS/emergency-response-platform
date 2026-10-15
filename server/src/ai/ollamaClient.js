import { HttpError } from '../utils/httpError.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 60000;

export async function checkOllamaAvailability(model = DEFAULT_MODEL) {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { ok: false, message: `Ollama returned HTTP ${res.status}` };
    }
    const data = await res.json();
    const installed = (data.models ?? []).some(
      (m) => m.name === model || m.name === `${model}:latest`
    );
    if (!installed) {
      return {
        ok: false,
        message: `Model "${model}" is not installed locally. Run: ollama pull ${model}`,
      };
    }
    return { ok: true, model };
  } catch {
    return {
      ok: false,
      message: `Ollama is offline or unreachable at ${OLLAMA_BASE_URL}. Ensure Ollama is running.`,
    };
  }
}

export async function callOllama({
  prompt,
  systemPrompt,
  format = 'json',
  model = DEFAULT_MODEL,
  temperature = 0.1,
}) {
  const url = `${OLLAMA_BASE_URL}/api/generate`;
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        ...(format && format !== 'text' ? { format } : {}),
        stream: false,
        options: {
          temperature,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new HttpError(
        504,
        'OLLAMA_TIMEOUT',
        `Local AI generation timed out after ${TIMEOUT_MS / 1000}s. If your system is under heavy load, try a lighter model like llama3.2:3b.`
      );
    }
    throw new HttpError(
      503,
      'OLLAMA_OFFLINE',
      `Cannot connect to local Ollama service at ${OLLAMA_BASE_URL}. Start Ollama and ensure the model "${model}" is loaded.`
    );
  }

  if (response.status === 404) {
    throw new HttpError(
      404,
      'MODEL_NOT_FOUND',
      `Ollama model "${model}" is not installed. Run "ollama pull ${model}" in your terminal.`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new HttpError(
      502,
      'OLLAMA_ERROR',
      `Ollama returned error (${response.status}): ${text || 'Generation failed'}`
    );
  }

  const data = await response.json();
  return {
    rawOutput: data.response,
    model: data.model || model,
    totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : null,
  };
}

