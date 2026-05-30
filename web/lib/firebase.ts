"use client";

import { FirebaseError, initializeApp, getApps } from "firebase/app";
import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function googleSignIn() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function sendPhoneOtp(phone: string, containerId: string): Promise<ConfirmationResult> {
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return signInWithPhoneNumber(auth, phone, verifier);
}

export function confirmPhoneOtp(result: ConfirmationResult, code: string) {
  return result.confirm(code);
}

export function signOutFirebase() {
  return firebaseSignOut(auth);
}

export function firebaseMessage(error: unknown) {
  return error instanceof FirebaseError ? error.message : "Authentication failed";
}
