import { asyncHandler } from '../utils/asyncHandler.js';
import { listAuditLogs } from '../services/auditService.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const query = req.validated?.query || req.query;
  const result = await listAuditLogs(query);
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: result,
  });
});

