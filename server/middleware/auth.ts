import { Request, Response, NextFunction } from 'express';
import { getAdminAuth, getAdminDb } from '../config/firebase';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    displayName?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthenticated. Missing bearer token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check firestore user doc for role and session validity (force logout support)
    let role = 'User';
    try {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const uRole = userData?.role;
        if (uRole === 'Admin' || uRole === 'Super Admin' || uRole === 'User') {
          role = uRole;
        } else if (uRole === 'admin') {
          role = 'Admin';
        }

        // Session validation / Force logout support
        const forceLogoutTimestamp = userData?.forceLogoutTimestamp;
        if (forceLogoutTimestamp && decodedToken.auth_time) {
          const authTimeMs = decodedToken.auth_time * 1000;
          const forceLogoutMs = new Date(forceLogoutTimestamp).getTime();
          if (authTimeMs < forceLogoutMs) {
            return res.status(401).json({ error: 'Session revoked. Force logout initiated. Please log in again.' });
          }
        }
      } else {
        if (decodedToken.role === 'Admin' || decodedToken.role === 'Super Admin' || decodedToken.role === 'admin') {
          role = decodedToken.role === 'admin' ? 'Admin' : decodedToken.role;
        }
      }
    } catch (e) {
      if (decodedToken.role === 'Admin' || decodedToken.role === 'Super Admin' || decodedToken.role === 'admin') {
        role = decodedToken.role === 'admin' ? 'Admin' : decodedToken.role;
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role,
      displayName: decodedToken.name,
    };
    
    next();
  } catch (error) {
    console.error('Failed to verify token:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== 'Admin' && role !== 'Super Admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    next();
  });
}
