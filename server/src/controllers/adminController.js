import { asyncHandler } from '../utils/asyncHandler.js';
import { listUsers } from '../services/userService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await listUsers();
  res.json({ success: true, data: { users } });
});