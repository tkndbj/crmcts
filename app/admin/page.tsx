"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiX, FiUser } from "react-icons/fi";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import firebaseApp from "../../firebaseClient";
import { motion, AnimatePresence } from "framer-motion";

const firestore = getFirestore(firebaseApp);

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Fetch the list of users from Firestore
  useEffect(() => {
    const usersRef = collection(firestore, "users");
    const unsub = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    });
    return () => unsub();
  }, []);

  // Handle the form submission to create a new user account.
  // IMPORTANT: The /api/createUser endpoint should create the new Firebase Auth user
  // and then create a Firestore user document with its ID set to the new user's UID.
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        throw new Error("Error creating user");
      }
      // Reset form and close modal on success
      setModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6 flex items-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mr-4">
          <FiUser className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Kullanıcılar
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Yönetim panelinden kullanıcıları görüntüleyin ve oluşturun.
          </p>
        </div>
      </div>

      {/* Create User Button */}
      <div className="mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <FiPlus size={20} className="mr-2" />
          <span>Yeni Kullanıcı Ekle</span>
        </button>
      </div>

      {/* Users List Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        {users.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <li key={user.id} className="py-3">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {user.displayName || user.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {user.email}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">
            Kullanıcı bulunamadı.
          </p>
        )}
      </div>

      {/* Modal for creating new user */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FiX size={20} />
              </button>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Yeni Kullanıcı Oluştur
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    İsim
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Oluştur
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
