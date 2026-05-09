import { Router } from 'express';
import { loginOrSignupWithGoogle } from '../../application/services/authService';

const router = Router();

router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required' });
    }

    const result = await loginOrSignupWithGoogle(idToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
