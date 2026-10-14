import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAudit } from '../services/auditService.js';
import { publicUser, recordLogin, signSession, verifyCredentials } from '../services/authService.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.isProduction, // requires HTTPS in production
  path: '/',
};

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.validated.body;
  const result = await verifyCredentials(username, password);

  if (!result.ok) {
    await logAudit({
      req,
      userId: result.user?.id,
      username: result.user?.username,
      action: 'auth.login_failed',
      resourceType: result.user ? 'user' : null,
      resourceId: result.user?.id,
      details: { reason: result.reason },
    });
    // Same message for every failure reason.
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  await recordLogin(result.user.id);
  const token = signSession(result.user);
  res.cookie(config.cookieName, token, {
    ...cookieOptions,
    maxAge: config.sessionHours * 60 * 60 * 1000,
  });

  await logAudit({
    req,
    userId: result.user.id,
    username: result.user.username,
    action: 'auth.login',
    resourceType: 'user',
    resourceId: result.user.id,
  });

  res.json({ success: true, data: { user: publicUser(result.user) } });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await logAudit({
      req,
      action: 'auth.logout',
      resourceType: 'user',
      resourceId: req.user.id,
    });
  }
  res.clearCookie(config.cookieName, cookieOptions);
  res.json({ success: true, data: {} });
});

export const me = (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
};