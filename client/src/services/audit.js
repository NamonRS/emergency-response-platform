import { api } from './api.js';

export function listAuditLogs({
  action = '',
  resourceType = '',
  userId = '',
  fromDate = '',
  toDate = '',
  search = '',
  page = 1,
  pageSize = 20,
} = {}) {
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (resourceType) params.set('resourceType', resourceType);
  if (userId) params.set('userId', String(userId));
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return api(`/audit-logs?${params.toString()}`);
}

