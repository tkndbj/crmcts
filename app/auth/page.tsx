"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // For navigation
import "../globals.css";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import firebaseApp from "../../firebaseClient";

// Import Firestore functions
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const AuthPage = () => {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to save user data in Firestore
  const saveUserToFirestore = async (user: any) => {
    if (!user) return;
    const userRef = doc(firestore, "users", user.uid);
    // Using merge:true so that existing data is preserved if present.
    await setDoc(
      userRef,
      {
        email: user.email,
        displayName: user.displayName || "",
        lastLogin: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let credential;
      if (isRegistering) {
        // Create account and return credential object
        credential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Sign in
        credential = await signInWithEmailAndPassword(auth, email, password);
      }
      // Save user details in Firestore
      await saveUserToFirestore(credential.user);
      // Redirect user to /navigation on success
      router.push("/navigation");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      // Save user details in Firestore
      await saveUserToFirestore(credential.user);
      // Redirect user to /navigation on success
      router.push("/navigation");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-gray-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-600 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 mb-4"
          >
            {loading ? "Processing..." : isRegistering ? "Register" : "Login"}
          </button>
        </form>

        <div className="flex items-center justify-center mb-4">
          <span className="border-b w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-gray-500 uppercase mx-2">
            or
          </span>
          <span className="border-b w-1/5 lg:w-1/4"></span>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 px-4 border border-gray-300 rounded hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 111 504 0 392.9 0 256 0 119.1 111 8 248 8c66.3 0 121 24.4 162.1 63.5l-65.6 63.5C320.3 90.4 285.2 72 248 72 152 72 72 152.1 72 256s80 184 176 184c96 0 156-68.4 161.4-164.3H248v-132h240c2.3 12.4 3.6 25.7 3.6 40z"
            ></path>
          </svg>
          {loading ? "Processing..." : "Sign in with Google"}
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isRegistering
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-500 hover:underline font-semibold"
            >
              {isRegistering ? "Login" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
