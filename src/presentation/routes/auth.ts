import { Router } from 'express';
import { loginOrSignup } from '../../application/services/authService';

const router = Router();

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

export default router;
