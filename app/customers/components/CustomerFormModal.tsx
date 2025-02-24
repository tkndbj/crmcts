"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    lastCallDate: string;
    description: string;
    interested: string; // New field
    channel: string; // New Field: Kanal
    durum: string; // New Field: Durum
    callStatus: "cevapAlindi" | "cevapsiz"; // NEW: Mode selection
    missedCall: boolean; // NEW: Based on mode
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
      address: string;
      lastCallDate: string;
      description: string;
      interested: string; // New field
      channel: string; // New Field: Kanal
      durum: string; // New Field: Durum
      callStatus: "cevapAlindi" | "cevapsiz"; // NEW: Mode selection
      missedCall: boolean; // NEW: Based on mode
    }>
  >;
  error: string | null;
  loading: boolean;
  selectedCustomer: any;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleLastCallDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  error,
  loading,
  selectedCustomer,
  handleInputChange,
  handleLastCallDateChange,
}: CustomerFormModalProps) {
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-2xl"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {selectedCustomer ? "Müşteriyi Düzenle" : "Müşteri Ekle"}
            </h2>
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            {/* Top Mode Selection Buttons */}
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, callStatus: "cevapAlindi", missedCall: false })
                }
                className={`px-4 py-2 border rounded-full transition-colors ${
                  form.callStatus === "cevapAlindi"
                    ? "bg-[#00A86B] text-white"
                    : "bg-transparent text-gray-700 dark:text-gray-300"
                }`}
              >
                Cevap Alındı
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, callStatus: "cevapsiz", missedCall: true })
                }
                className={`px-4 py-2 border rounded-full transition-colors ${
                  form.callStatus === "cevapsiz"
                    ? "bg-[#00A86B] text-white"
                    : "bg-transparent text-gray-700 dark:text-gray-300"
                }`}
              >
                Cevapsız
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Render fields conditionally based on callStatus */}
              {form.callStatus === "cevapAlindi" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      İsim
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      E-posta
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Telefon
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              {form.callStatus === "cevapAlindi" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Adres
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      İlgilendiği daire
                    </label>
                    <input
                      type="text"
                      name="interested"
                      value={form.interested}
                      onChange={handleInputChange}
                      placeholder="İlgilendiği daire"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {form.callStatus === "cevapAlindi"
                    ? "Arama Tarihi"
                    : "Son Arama Tarihi"}
                </label>
                <input
                  type="text"
                  name="lastCallDate"
                  placeholder="GG/AA/YYYY"
                  value={form.lastCallDate}
                  onChange={handleLastCallDateChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              {form.callStatus === "cevapAlindi" && (
                <>
                  {/* Kanal Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Kanal <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {[
                        "Instagram",
                        "Facebook",
                        "TikTok",
                        "Youtube",
                        "Website iletişim form",
                        "Whatsapp",
                        "Telefon",
                        "Lead",
                      ].map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => setForm({ ...form, channel: option })}
                          className={`px-4 py-2 border rounded-full transition-colors ${
                            form.channel === option
                              ? "bg-[#00A86B] text-white"
                              : "bg-transparent text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Durum Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Durum <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {["Olumlu", "Orta", "Olumsuz"].map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => setForm({ ...form, durum: option })}
                          className={`px-4 py-2 border rounded-full transition-colors ${
                            form.durum === option
                              ? "bg-[#00A86B] text-white"
                              : "bg-transparent text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Açıklama Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Açıklama <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      rows={3}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    ></textarea>
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {loading
                    ? selectedCustomer
                      ? "Güncelleniyor..."
                      : "Ekleniyor..."
                    : selectedCustomer
                    ? "Müşteriyi Güncelle"
                    : "Müşteri Ekle"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
