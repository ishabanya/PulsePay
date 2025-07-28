import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

router.post('/init-user', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // User is already authenticated via middleware
    // Just return success for initialization
    res.json({ 
      success: true, 
      userId,
      message: 'User initialized successfully' 
    });
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;