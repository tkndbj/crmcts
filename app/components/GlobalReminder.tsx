// app/components/GlobalReminder.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  Timestamp,
  addDoc,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function GlobalReminder() {
  const [liveReminderModalOpen, setLiveReminderModalOpen] = useState(false);
  const [liveReminderMessage, setLiveReminderMessage] = useState("");
  const [reminderCustomerId, setReminderCustomerId] = useState<string | null>(
    null
  );
  const firestore = getFirestore();
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    // Save the current user in a variable.
    const currentUser = auth.currentUser;
    if (!currentUser) return; // Exit if no user is logged in.

    // Create a query for any customer reminder set by the current user.
    const customersRef = collection(firestore, "customers");
    const reminderQuery = query(
      customersRef,
      where("owner", "==", currentUser.uid),
      where("reminderTimestamp", "!=", null)
    );

    // Define a function to check for expired reminders.
    const checkReminders = async () => {
      const snapshot = await getDocs(reminderQuery);
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.reminderTimestamp) {
          const reminderDate = data.reminderTimestamp.toDate();
          // If the reminder time is due or has passed...
          if (reminderDate <= new Date()) {
            const message = `Hatırlatma: ${data.name}${
              data.reminderDescription
                ? " - Açıklama: " + data.reminderDescription
                : ""
            }`;
            // Open the modal with the reminder message.
            setLiveReminderMessage(message);
            setLiveReminderModalOpen(true);
            // Store the customer ID for profile navigation.
            setReminderCustomerId(docSnap.id);
            // Create a notification document in the notifications collection.
            await addDoc(collection(firestore, "notifications"), {
              user: currentUser.uid,
              customerId: docSnap.id,
              message: message,
              createdAt: new Date().toISOString(),
              unread: true,
            });
            // Clear the reminder fields on the customer document to prevent duplicate notifications.
            await updateDoc(doc(firestore, "customers", docSnap.id), {
              reminderTimestamp: null,
              reminderDescription: "",
            });
          }
        }
      });
    };

    // Run the check immediately and then every 30 seconds.
    checkReminders();
    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [auth.currentUser, firestore]);

  return (
    <AnimatePresence>
      {liveReminderModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black"
            onClick={() => setLiveReminderModalOpen(false)}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
          >
            {/* "Profile git" button on top right */}
            <button
              onClick={() => {
                if (reminderCustomerId) {
                  router.push(`/customerprofile?id=${reminderCustomerId}`);
                }
                setLiveReminderModalOpen(false);
              }}
              className="absolute top-4 right-4 bg-transparent border border-gray-500 dark:border-gray-300 rounded-full px-3 py-1 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Profile git
            </button>
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
              Hatırlatma
            </h2>
            <p className="text-lg text-black dark:text-white">
              {liveReminderMessage}
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setLiveReminderModalOpen(false)}
                className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors text-black dark:text-white"
              >
                Tamam
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
