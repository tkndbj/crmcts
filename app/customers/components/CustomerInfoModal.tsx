"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiUser } from "react-icons/fi";
import { useRouter } from "next/navigation";
import React from "react";

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export default function CustomerInfoModal({
  isOpen,
  onClose,
  customer,
}: CustomerInfoModalProps) {
  const router = useRouter();
  if (!customer) return null;

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
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
          >
            <button
              onClick={() => router.push(`/dynamiccustomer?id=${customer.id}`)}
              className="absolute top-4 right-4"
            >
              <FiUser size={24} className="text-blue-500" />
            </button>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Müşteri Bilgileri
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>İsim:</strong> {customer.name}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>E-posta:</strong> {customer.email}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Telefon:</strong> {customer.phone}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Adres:</strong> {customer.address}
            </p>
            {customer.lastCallDate && (
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Son Arama Tarihi:</strong> {customer.lastCallDate}
              </p>
            )}
            {customer.description && (
              <div className="bg-gray-100 p-2 rounded text-gray-700 dark:text-gray-300 mt-2">
                {customer.description}
              </div>
            )}
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              <strong>Ekleyen:</strong>{" "}
              {customer.ownerName ? customer.ownerName : "Bilinmiyor"}
            </p>
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
