import { HttpError } from '../utils/httpError.js';

// Validated data is placed on req.validated[source]; handlers should use that, not raw input.
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid input.', details));
    }
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    return next();
  };