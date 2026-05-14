import { Router } from 'express';
import { loginOrSignup } from '../../application/services/authService';
import { requireAuth } from '../../shared/middleware/authMiddleware';
import { UserRepository } from '../../infrastructure/repositories/userRepository';

const router = Router();
const userRepository = new UserRepository();

router.post('/', async (req, res, next) => {
  try {
    const { provider, idToken } = req.body;
    if (!provider || !idToken) {
      return res.status(400).json({ message: 'provider and idToken are required' });
    }
    const result = await loginOrSignup(provider, idToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: any, res, next) => {
  try {
    const user = await userRepository.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;