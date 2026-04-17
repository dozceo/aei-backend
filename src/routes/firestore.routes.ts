/**
 * Firestore API Routes
 * Exposes generic Firestore CRUD operations via REST API
 */

import express, { Request, Response, Router } from "express";
import firestoreService from "../services/firestore.service";

const router: Router = express.Router();

/**
 * GET /firestore/:collection/:docId
 * Get a single document
 */
router.get("/firestore/:collection/:docId", async (req: Request, res: Response) => {
  try {
    const { collection, docId } = req.params;
    const doc = await firestoreService.read(collection, docId);

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /firestore/:collection
 * Get all documents in a collection or query with conditions
 */
router.get("/firestore/:collection", async (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    const { limit, orderBy, order } = req.query;

    let docs;

    if (limit) {
      docs = await firestoreService.getAll(collection);
      docs = docs.slice(0, parseInt(limit as string));
    } else {
      docs = await firestoreService.getAll(collection);
    }

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /firestore/:collection
 * Create a new document
 */
router.post("/firestore/:collection", async (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    const docId = await firestoreService.create(collection, req.body);

    res.status(201).json({ id: docId, message: "Document created successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /firestore/:collection/:docId
 * Update a document (merge)
 */
router.put("/firestore/:collection/:docId", async (req: Request, res: Response) => {
  try {
    const { collection, docId } = req.params;

    const exists = await firestoreService.exists(collection, docId);
    if (!exists) {
      return res.status(404).json({ error: "Document not found" });
    }

    await firestoreService.update(collection, docId, req.body);
    res.json({ id: docId, message: "Document updated successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /firestore/:collection/:docId
 * Patch specific fields in a document
 */
router.patch("/firestore/:collection/:docId", async (req: Request, res: Response) => {
  try {
    const { collection, docId } = req.params;

    const exists = await firestoreService.exists(collection, docId);
    if (!exists) {
      return res.status(404).json({ error: "Document not found" });
    }

    await firestoreService.patch(collection, docId, req.body);
    res.json({ id: docId, message: "Document patched successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /firestore/:collection/:docId
 * Delete a document
 */
router.delete("/firestore/:collection/:docId", async (req: Request, res: Response) => {
  try {
    const { collection, docId } = req.params;

    const exists = await firestoreService.exists(collection, docId);
    if (!exists) {
      return res.status(404).json({ error: "Document not found" });
    }

    await firestoreService.delete(collection, docId);
    res.json({ id: docId, message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /firestore/:collection/query
 * Query documents with conditions
 * Body: { conditions: [{ field: string, operator: string, value: any }] }
 */
router.post("/firestore/:collection/query", async (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    const { conditions = [] } = req.body;

    const docs = await firestoreService.query(collection, conditions);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /firestore/batch
 * Batch write operations
 * Body: { operations: [{ type: "set|update|delete", collection: string, docId: string, data?: any }] }
 */
router.post("/firestore/batch", async (req: Request, res: Response) => {
  try {
    const { operations = [] } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: "Batch operations must be a non-empty array" });
    }

    await firestoreService.batch(operations);
    res.json({ message: `${operations.length} operations completed successfully` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
