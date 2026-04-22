import { Router, Request, Response } from "express";
import { auth as firebaseAuth } from "../lib/firebase";
import firestoreService from "../services/firestore.service";
import seedService from "../services/seed.service";
import { verifyAuth } from "../server/middleware/auth";
import { logger } from "../server/utils/logger";

const router = Router();

/**
 * POST /api/auth/init-user
 * Initializes Firestore data for a new user and sets custom role claims.
 * Requires a valid Firebase Auth token in the Authorization header.
 */
router.post("/init-user", verifyAuth, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const { uid, email } = req.user!; // Set by verifyAuth

    if (!role || !["STUDENT", "TEACHER", "PARENT"].includes(role)) {
      return res.status(400).json({ error: "Invalid or missing role" });
    }

    logger.info(`Initializing user ${uid} with role ${role}`);

    // 1. Set Custom Claims in Firebase Auth
    await firebaseAuth.setCustomUserClaims(uid, {
      role: role,
      roles: [role]
    });

    // 2. Initialize Firestore User Document
    const timestamp = new Date().toISOString();
    const userDocData = {
      uid,
      email: email || "",
      role,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestoreService.set("users", uid, userDocData);

    // 3. Initialize Role-Specific Document
    const roleCollectionMap: Record<string, string> = {
      STUDENT: "students",
      TEACHER: "teachers",
      PARENT: "parents",
    };
    const roleCollection = roleCollectionMap[role];
    
    await firestoreService.set(roleCollection, uid, userDocData);

    // 4. Seed Role-Specific Page Data
    await seedService.seedUserPages(uid, role);

    res.status(200).json({ 
      message: "User initialized successfully",
      role 
    });
  } catch (error) {
    logger.error("Failed to initialize user:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
