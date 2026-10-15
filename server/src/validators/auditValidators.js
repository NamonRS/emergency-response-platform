import { z } from 'zod';

export const bigintIdRegex = /^\d{1,15}$/;

export const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().trim().max(100).optional(),
    resourceType: z.string().trim().max(100).optional(),
    resource_type: z.string().trim().max(100).optional(),
    userId: z
      .union([z.string().regex(bigintIdRegex), z.number().int().positive()])
      .nullish(),
    user_id: z
      .union([z.string().regex(bigintIdRegex), z.number().int().positive()])
      .nullish(),
    fromDate: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: 'Invalid fromDate format.',
      }),
    from_date: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: 'Invalid fromDate format.',
      }),
    toDate: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: 'Invalid toDate format.',
      }),
    to_date: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: 'Invalid toDate format.',
      }),
    search: z.string().trim().max(100).optional(),
    q: z.string().trim().max(100).optional(),
  })
  .transform((data) => ({
    page: data.page,
    pageSize: data.pageSize,
    action: data.action || undefined,
    resourceType: data.resourceType || data.resource_type || undefined,
    userId:
      data.userId != null
        ? String(data.userId)
        : data.user_id != null
          ? String(data.user_id)
          : undefined,
    fromDate: data.fromDate || data.from_date || undefined,
    toDate: data.toDate || data.to_date || undefined,
    search: data.search || data.q || undefined,
  }));

