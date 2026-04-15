"use strict";
/**
 * Firebase Admin SDK Initialization
 * This module initializes the Firebase Admin SDK for backend use
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = exports.firebaseAdmin = void 0;
const admin = __importStar(require("firebase-admin"));
function parseServiceAccountFromEnv() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.');
    }
}
if (!admin.apps.length) {
    const serviceAccount = parseServiceAccountFromEnv();
    const resolvedProjectId = process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        'sankalp-learning';
    admin.initializeApp({
        credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
        projectId: resolvedProjectId,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}
exports.firebaseAdmin = admin;
exports.db = admin.firestore();
exports.auth = admin.auth();
exports.default = admin;
//# sourceMappingURL=firebase.js.map