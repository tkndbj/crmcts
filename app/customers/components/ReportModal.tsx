"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportLoading: boolean;
  onGenerateReport: (option: "user" | "all") => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  reportLoading,
  onGenerateReport,
}: ReportModalProps) {
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Rapor Seçimi
            </h2>
            {reportLoading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-blue-500">
                  Rapor hazırlanıyor...
                </span>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => onGenerateReport("user")}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Kendi müşterilerim için
                </button>
                <button
                  onClick={() => onGenerateReport("all")}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Tüm müşteriler için
                </button>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
