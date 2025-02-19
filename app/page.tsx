"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";
import {
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebaseClient"; // Directly import the same auth
import { getFirestore, doc, setDoc } from "firebase/firestore";
import firebaseApp from "../firebaseClient";

const firestore = getFirestore(firebaseApp);

const AuthPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to save user data in Firestore
  const saveUserToFirestore = async (user: any) => {
    if (!user) return;
    const userRef = doc(firestore, "users", user.uid);
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
      // No need to call setPersistence again here; it's already set globally
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(credential.user);

      // Redirect on successful login
      router.push("/navigation");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/video1.mp4" type="video/mp4" />
      </video>

      {/* Login Card */}
      <div className="relative z-10 bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8">Giriş Yap</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-gray-600 mb-1">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              placeholder="E-postanızı girin"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-600 mb-1">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              placeholder="Şifrenizi girin"
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
            {loading ? "İşleniyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
