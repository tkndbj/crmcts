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
              onClick={() => router.push(`/customerprofile?id=${customer.id}`)}
              className="absolute top-4 right-4"
            >
              <FiUser size={24} className="text-blue-500" />
            </button>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Müşteri Bilgileri
              </h3>
            </div>
            {customer.missedCall ? (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Telefon:</strong> {customer.phone}
                </p>
                {customer.lastCallDate && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>İlk Arama Tarihi:</strong> {customer.lastCallDate}
                  </p>
                )}
              </>
            ) : (
              <>
                {customer.name && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>İsim:</strong> {customer.name}
                  </p>
                )}
                {customer.email && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>E-posta:</strong> {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Telefon:</strong> {customer.phone}
                  </p>
                )}
                {customer.address && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Adres:</strong> {customer.address}
                  </p>
                )}
                {customer.lastCallDate && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>İlk Arama Tarihi:</strong> {customer.lastCallDate}
                  </p>
                )}
                {customer.callDates && customer.callDates.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-700 dark:text-white">
                      <strong>Tekrardan Arama Tarihleri:</strong>
                    </p>
                    <ul className="list-disc ml-4 text-emerald-500">
                      {customer.callDates.map((date: string, index: number) => (
                        <li key={index}>{date}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {customer.description && (
                  <div className="bg-gray-100 p-2 rounded text-gray-700 dark:text-black mt-2">
                    {customer.description}
                  </div>
                )}
                {customer.channel && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Kanal:</strong> {customer.channel}
                  </p>
                )}
                {customer.durum && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Durum:</strong> {customer.durum}
                  </p>
                )}
                {customer.interested && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>İlgilendiği Daire:</strong> {customer.interested}
                  </p>
                )}
                <p className="text-gray-700 dark:text-gray-300 mt-4">
                  <strong>Ekleyen:</strong>{" "}
                  {customer.ownerName ? customer.ownerName : "Bilinmiyor"}
                </p>
              </>
            )}
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
