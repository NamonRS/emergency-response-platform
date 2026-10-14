// Forwards rejected promises to the error handler (safe on Express 4 and 5).
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);