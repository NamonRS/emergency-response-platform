import { api } from './api.js';

export async function queryAssistant({ message, conversationHistory = [] }) {
  return api('/assistant/query', {
    method: 'POST',
    body: { message, conversationHistory },
  });
}
