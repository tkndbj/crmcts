"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSortOption: (option: string) => void;
}

export default function SortModal({
  isOpen,
  onClose,
  onSelectSortOption,
}: SortModalProps) {
  const sortOptions = [
    { value: "createdAsc", label: "Eklenme tarihine göre (eskiden yeniye)" },
    { value: "createdDesc", label: "Eklenme tarihine göre (yeniden eskiye)" },
    { value: "nameAsc", label: "Alfabetik" },
    { value: "nameDesc", label: "Alfabetik (tersden)" },
    {
      value: "lastCallAsc",
      label: "Son aranma tarihine göre (eskiden yeniye)",
    },
    {
      value: "lastCallDesc",
      label: "Son aranma tarihine göre (yeniden eskiye)",
    },
  ];

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
              Sırala Seçenekleri
            </h2>
            <div className="flex flex-col space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSelectSortOption(option.value)}
                  className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                >
                  {option.label}
                </button>
              ))}
            </div>
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
