import { api } from './api.js';

export function listPatients({ q = '', page = 1 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  return api(`/patients?${params}`);
}

export const getPatient = (id) => api(`/patients/${id}`);
export const createPatient = (body) => api('/patients', { method: 'POST', body });
export const updatePatient = (id, body) => api(`/patients/${id}`, { method: 'PUT', body });

export const generatePatientAiSummary = (id) =>
  api(`/patients/${id}/ai-summary`, { method: 'POST' });

export const acceptPatientAiSummary = (id, body) =>
  api(`/patients/${id}/ai-summary/accept`, { method: 'POST', body });