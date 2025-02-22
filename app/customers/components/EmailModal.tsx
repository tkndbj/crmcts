"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmailCustomer: any;
  emailSubject: string;
  setEmailSubject: React.Dispatch<React.SetStateAction<string>>;
  emailMessage: string;
  setEmailMessage: React.Dispatch<React.SetStateAction<string>>;
  emailSending: boolean;
  emailError: string | null;
  onSendEmail: (e: React.FormEvent<HTMLFormElement>) => void;
  authEmail: string;
}

export default function EmailModal({
  isOpen,
  onClose,
  selectedEmailCustomer,
  emailSubject,
  setEmailSubject,
  emailMessage,
  setEmailMessage,
  emailSending,
  emailError,
  onSendEmail,
  authEmail,
}: EmailModalProps) {
  if (!selectedEmailCustomer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            onClick={onClose}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-lg"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              E-posta Gönder
            </h2>
            {emailError && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {emailError}
              </div>
            )}
            <form onSubmit={onSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Gönderen:
                </label>
                <input
                  type="email"
                  value={authEmail}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Kime:
                </label>
                <input
                  type="email"
                  value={selectedEmailCustomer.email}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Konu:
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mesaj:
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  required
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={emailSending}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  {emailSending ? "Gönderiliyor..." : "E-posta Gönder"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
