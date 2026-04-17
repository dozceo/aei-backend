/**
 * Firestore Service Layer
 * Backend service for Firestore CRUD operations with admin SDK
 */

import { db } from "../lib/firebase";
import { FieldValue, Query, CollectionReference } from "firebase-admin/firestore";

export interface QueryCondition {
  field: string;
  operator: "<" | "<=" | "==" | "!=" | ">=" | ">" | "array-contains" | "in" | "array-contains-any";
  value: any;
}

export class FirestoreService {
  /**
   * Create a new document with auto-generated ID
   */
  async create(collection: string, data: any): Promise<string> {
    const docRef = await db.collection(collection).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  /**
   * Set a document with a specific ID (overwrites if exists)
   */
  async set(collection: string, docId: string, data: any): Promise<void> {
    await db.collection(collection).doc(docId).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Read a single document
   */
  async read(collection: string, docId: string): Promise<any | null> {
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Update a document (merges with existing data)
   */
  async update(collection: string, docId: string, data: any): Promise<void> {
    await db.collection(collection).doc(docId).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Patch specific fields in a document
   */
  async patch(collection: string, docId: string, updates: Record<string, any>): Promise<void> {
    await db.collection(collection).doc(docId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Delete a document
   */
  async delete(collection: string, docId: string): Promise<void> {
    await db.collection(collection).doc(docId).delete();
  }

  /**
   * Get all documents in a collection
   */
  async getAll(collection: string): Promise<any[]> {
    const snapshot = await db.collection(collection).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Query documents with conditions
   */
  async query(collection: string, conditions: QueryCondition[]): Promise<any[]> {
    let query: Query | CollectionReference = db.collection(collection);

    conditions.forEach(({ field, operator, value }) => {
      query = (query as any).where(field, operator, value);
    });

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Query with ordering
   */
  async queryWithOrder(
    collection: string,
    conditions: QueryCondition[],
    orderBy: { field: string; direction: "asc" | "desc" }[]
  ): Promise<any[]> {
    let query: Query | CollectionReference = db.collection(collection);

    conditions.forEach(({ field, operator, value }) => {
      query = (query as any).where(field, operator, value);
    });

    orderBy.forEach(({ field, direction }) => {
      query = (query as any).orderBy(field, direction);
    });

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Query with limit
   */
  async queryLimit(
    collection: string,
    conditions: QueryCondition[],
    limit: number
  ): Promise<any[]> {
    let query: Query | CollectionReference = db.collection(collection);

    conditions.forEach(({ field, operator, value }) => {
      query = (query as any).where(field, operator, value);
    });

    const snapshot = await (query as any).limit(limit).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Check if a document exists
   */
  async exists(collection: string, docId: string): Promise<boolean> {
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists;
  }

  /**
   * Count documents in a collection
   */
  async count(collection: string): Promise<number> {
    const snapshot = await db.collection(collection).count().get();
    return snapshot.data().count;
  }

  /**
   * Batch write operations (for multiple operations in a transaction)
   */
  async batch(operations: Array<{
    type: "set" | "update" | "delete";
    collection: string;
    docId: string;
    data?: any;
  }>): Promise<void> {
    const batch = db.batch();

    operations.forEach(({ type, collection, docId, data }) => {
      const docRef = db.collection(collection).doc(docId);

      if (type === "set") {
        batch.set(docRef, {
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === "update") {
        batch.update(docRef, {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === "delete") {
        batch.delete(docRef);
      }
    });

    await batch.commit();
  }

  /**
   * Get documents in a subcollection
   */
  async getSubcollection(
    parentCollection: string,
    docId: string,
    subcollection: string
  ): Promise<any[]> {
    const snapshot = await db
      .collection(parentCollection)
      .doc(docId)
      .collection(subcollection)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Create a document in a subcollection
   */
  async createSubdocument(
    parentCollection: string,
    docId: string,
    subcollection: string,
    data: any
  ): Promise<string> {
    const docRef = await db
      .collection(parentCollection)
      .doc(docId)
      .collection(subcollection)
      .add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return docRef.id;
  }
}

export default new FirestoreService();
