import { Router } from 'express';
import { authController } from './auth.controller.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));
router.post('/quick-switch', (req, res) => authController.quickSwitch(req, res));
router.get('/me', auth, (req, res) => authController.me(req, res));

export default router;
