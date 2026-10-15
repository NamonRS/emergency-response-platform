import { api } from './api.js';

export function listIncidents({
  q = '',
  page = 1,
  pageSize = 10,
  status = '',
  severity = '',
  incident_type = '',
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  if (incident_type) params.set('incident_type', incident_type);

  return api(`/incidents?${params.toString()}`);
}

export const getIncident = (id) => api(`/incidents/${id}`);

export const createIncident = (body) =>
  api('/incidents', { method: 'POST', body });

export const updateIncidentStatus = (id, body) =>
  api(`/incidents/${id}/status`, { method: 'PATCH', body });

export const addIncidentEvent = (id, body) =>
  api(`/incidents/${id}/events`, { method: 'POST', body });

export const assignIncident = (id, body) =>
  api(`/incidents/${id}/assign`, { method: 'PATCH', body });

export const linkIncidentPatient = (id, body) =>
  api(`/incidents/${id}/patient`, { method: 'PATCH', body });

export const listAssignableUsers = () => api('/incidents/assignable-users');

export const generateIncidentAiSummary = (id) =>
  api(`/incidents/${id}/ai-summary`, { method: 'POST' });

export const acceptIncidentAiSummary = (id, body) =>
  api(`/incidents/${id}/ai-summary/accept`, { method: 'POST', body });

