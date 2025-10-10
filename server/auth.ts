import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv, scryptSync } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Derive a proper 32-byte encryption key using scrypt KDF
function deriveEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ENCRYPTION_SECRET or SESSION_SECRET must be at least 16 characters for secure API key encryption');
  }
  
  // Use scrypt to derive a proper 32-byte key from the secret
  const salt = 'myndmoney-api-key-encryption-v1';
  return scryptSync(secret, salt, 32);
}

const ENCRYPTION_KEY = deriveEncryptionKey();
const ALGORITHM = 'aes-256-cbc';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(null, false);
    }
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.redirect('/');
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Password reset - Request reset token
  app.post("/api/reset-password/request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not (security best practice)
        return res.status(200).json({ 
          message: "If an account exists with this email, a reset token will be generated" 
        });
      }

      // Generate 6-digit reset token
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      // In a real app, you'd send this via email
      // For now, we'll return it (DEVELOPMENT ONLY)
      res.status(200).json({ 
        message: "Reset token generated",
        token: resetToken, // TODO: Remove in production, send via email instead
        email: user.email
      });
    } catch (error) {
      console.error("Reset token generation error:", error);
      res.status(500).json({ error: "Failed to generate reset token" });
    }
  });

  // Password reset - Verify token and reset password
  app.post("/api/reset-password/confirm", async (req: Request, res: Response) => {
    try {
      const { email, token, newPassword } = req.body;
      
      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: "Email, token, and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      // Verify token and expiry
      if (!user.resetToken || !user.resetTokenExpiry) {
        return res.status(400).json({ error: "No reset token found" });
      }

      if (user.resetToken !== token) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (new Date() > new Date(user.resetTokenExpiry)) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.resetUserPassword(user.id, hashedPassword);

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}
