"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface UpdateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCallDate: string;
  setNewCallDate: React.Dispatch<React.SetStateAction<string>>;
  onUpdateCallDate: () => void;
}

export default function UpdateCallModal({
  isOpen,
  onClose,
  newCallDate,
  setNewCallDate,
  onUpdateCallDate,
}: UpdateCallModalProps) {
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-sm"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Son Arama Tarihini Güncelle
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Yeni Tarih (GG/AA/YYYY)
              </label>
              <input
                type="text"
                value={newCallDate}
                onChange={(e) => setNewCallDate(e.target.value)}
                placeholder="GG/AA/YYYY"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
              />
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
                type="button"
                onClick={onUpdateCallDate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
