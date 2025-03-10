"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import "../globals.css";
import { FiEdit, FiBell } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Modal components (reuse your existing modals from customers page)
import CustomerFormModal from "../customers/components/CustomerFormModal";
import ReminderModal from "../customers/components/ReminderModal";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  channel: string;
  description: string;
  durum: string;
  lastCallDate: string;
  missedCall: boolean;
  owner: string;
  ownerName: string;
  createdAt: string;
  updatedAt?: string;
  interested?: string;
  // Reminder fields (if set)
  reminderTimestamp?: { seconds: number; nanoseconds: number };
  reminderDescription?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  lastCallDate: string;
  description: string;
  interested: string;
  channel: string;
  durum: string;
  callStatus: "cevapAlindi" | "cevapsiz";
  missedCall: boolean;
}

function isOwner(customer: Customer) {
  const user = getAuth(firebaseApp).currentUser;
  return user && customer.owner === user.uid;
}

function CustomerProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  // ---------- Edit Modal State ----------
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    lastCallDate: "",
    description: "",
    interested: "",
    channel: "",
    durum: "",
    callStatus: "cevapAlindi",
    missedCall: false,
  });

  // ---------- Reminder Modal State ----------
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDelay, setReminderDelay] = useState("");
  const [reminderUnit, setReminderUnit] = useState("minutes");
  const [reminderAciklama, setReminderAciklama] = useState("");
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [reminderModalMode, setReminderModalMode] = useState<"new" | "edit">(
    "new"
  );

  // ---------- Fetch Customer ----------
  useEffect(() => {
    if (!customerId) return;
    const customerDocRef = doc(firestore, "customers", customerId);
    const unsubscribe = onSnapshot(
      customerDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
        } else {
          setCustomer(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching customer:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [customerId, firestore]);

  // ---------- Open Edit Modal ----------
  const handleOpenEditModal = () => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        lastCallDate: customer.lastCallDate || "",
        description: customer.description || "",
        interested: customer.interested || "",
        channel: customer.channel || "",
        durum: customer.durum || "",
        callStatus: customer.missedCall ? "cevapsiz" : "cevapAlindi",
        missedCall: customer.missedCall,
      });
      setEditModalOpen(true);
    }
  };

  // ---------- Save Edited Customer ----------
  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer) return;
    try {
      const customerRef = doc(firestore, "customers", customer.id);
      if (form.callStatus === "cevapsiz") {
        await updateDoc(customerRef, {
          phone: form.phone,
          lastCallDate: form.lastCallDate,
          missedCall: true,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(customerRef, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          lastCallDate: form.lastCallDate,
          description: form.description,
          interested: form.interested,
          channel: form.channel,
          durum: form.durum,
          missedCall: false,
          updatedAt: new Date().toISOString(),
        });
      }
      setEditModalOpen(false);
    } catch (error: any) {
      console.error("Error saving customer:", error);
    }
  };

  // ---------- Open Reminder Modal ----------
  const openReminderModal = (mode: "new" | "edit") => {
    if (!customer) return;
    setReminderModalMode(mode);
    if (mode === "new") {
      setReminderDelay("");
      setReminderUnit("minutes");
      setReminderAciklama("");
      setReminderDateTime("");
    } else if (mode === "edit") {
      if (customer.reminderTimestamp) {
        const reminderDate = new Date(
          customer.reminderTimestamp.seconds * 1000
        );
        const dtLocal = reminderDate.toISOString().substring(0, 16);
        setReminderUnit("days");
        setReminderDateTime(dtLocal);
      }
      setReminderAciklama(customer.reminderDescription || "");
      setReminderDelay("");
    }
    setReminderModalOpen(true);
  };

  // ---------- Set Reminder ----------
  const handleSetReminder = async () => {
    if (!customer) return;
    let targetTime: Date;
    if (reminderUnit === "days") {
      if (!reminderDateTime) return;
      targetTime = new Date(reminderDateTime);
      const delayMs = targetTime.getTime() - Date.now();
      if (delayMs <= 0) return;
    } else {
      const delayValue = parseInt(reminderDelay, 10);
      if (isNaN(delayValue)) return;
      if (reminderUnit === "minutes") {
        targetTime = new Date(Date.now() + delayValue * 60 * 1000);
      } else if (reminderUnit === "hours") {
        targetTime = new Date(Date.now() + delayValue * 3600 * 1000);
      } else {
        return;
      }
    }
    try {
      await updateDoc(doc(firestore, "customers", customer.id), {
        reminderTimestamp: Timestamp.fromDate(targetTime),
        reminderDescription: reminderAciklama,
      });
      setReminderModalOpen(false);
      setReminderAciklama("");
      setReminderDelay("");
      setReminderDateTime("");
    } catch (error) {
      console.error("Error setting reminder:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-100">
          Yükleniyor...
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-100">
          Müşteri bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Header with Customer Name and Action Icons */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {customer.name}
          </h1>
          {isOwner(customer) && (
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleOpenEditModal}
                title="Müşteriyi Düzenle"
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                <FiEdit size={20} />
              </button>
              <button
                onClick={() => openReminderModal("new")}
                title="Hatırlatma Ayarla"
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                <FiBell
                  size={20}
                  className={
                    customer.reminderTimestamp &&
                    new Date(customer.reminderTimestamp.seconds * 1000) >
                      new Date()
                      ? "text-yellow-500"
                      : "text-blue-700"
                  }
                />
              </button>
            </div>
          )}
        </div>
        {/* Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Durum:</span> {customer.durum}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Telefon:</span> {customer.phone}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">E-posta:</span>{" "}
              {customer.email || "Yok"}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Kanal:</span> {customer.channel}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">İlgilendiği:</span>{" "}
              {customer.interested || "Bilinmiyor"}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Adres:</span>{" "}
              {customer.address || "Belirtilmemiş"}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Açıklama:</span>{" "}
              {customer.description || "Yok"}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Son Arama Tarihi:</span>{" "}
              {customer.lastCallDate}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Oluşturan:</span>{" "}
              {customer.ownerName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Oluşturma Tarihi:</span>{" "}
              {new Date(customer.createdAt).toLocaleString()}
            </p>
            {customer.updatedAt && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Güncelleme Tarihi:</span>{" "}
                {new Date(customer.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Edit Modal ---------- */}
      {editModalOpen && (
        <CustomerFormModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setCustomer(null);
          }}
          onSubmit={handleSaveCustomer}
          form={form}
          setForm={setForm}
          error={null}
          loading={false}
          selectedCustomer={customer}
          handleInputChange={(e) =>
            setForm({ ...form, [e.target.name]: e.target.value })
          }
          handleLastCallDateChange={(e) =>
            setForm({ ...form, lastCallDate: e.target.value })
          }
        />
      )}

      {/* ---------- Reminder Modal ---------- */}
      {reminderModalOpen && (
        <AnimatePresence>
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
              onClick={() => setReminderModalOpen(false)}
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 z-10 w-full max-w-md relative"
            >
              {/* "Profile git" button on top right */}
              <button
                onClick={() => {
                  router.push(`/customerprofile?id=${customer.id}`);
                  setReminderModalOpen(false);
                }}
                className="absolute top-4 right-4 bg-transparent border border-gray-400 dark:border-gray-300 rounded-full px-3 py-1 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Profile git
              </button>
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {reminderModalMode === "new"
                  ? `${customer.name} için Hatırlatma Ayarla`
                  : `${customer.name} için Ayarlanmış Hatırlatmayı Düzenle`}
              </h2>
              <div className="space-y-4">
                {reminderUnit === "days" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                      Tarih ve Saat
                    </label>
                    <input
                      type="datetime-local"
                      value={reminderDateTime}
                      onChange={(e) => setReminderDateTime(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                      Süre
                    </label>
                    <input
                      type="number"
                      value={reminderDelay}
                      onChange={(e) => setReminderDelay(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Süre girin"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                    Birim
                  </label>
                  <select
                    value={reminderUnit}
                    onChange={(e) => setReminderUnit(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="minutes">Dakika</option>
                    <option value="hours">Saat</option>
                    <option value="days">Gün</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    value={reminderAciklama}
                    onChange={(e) => setReminderAciklama(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Açıklama girin"
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-800 dark:text-gray-100"
                  >
                    İptal
                  </button>
                  {reminderModalMode === "edit" && (
                    <>
                      <button
                        type="button"
                        onClick={handleSetReminder}
                        className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors text-gray-100"
                      >
                        Güncelle
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReminderModalOpen(false);
                        }}
                        className="px-4 py-2 bg-red-500 rounded-md hover:bg-red-600 transition-colors text-gray-100"
                      >
                        Sil
                      </button>
                    </>
                  )}
                  {reminderModalMode === "new" && (
                    <button
                      type="button"
                      onClick={handleSetReminder}
                      className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors text-gray-100"
                    >
                      Ayarla
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <CustomerProfileContent />
    </Suspense>
  );
}
