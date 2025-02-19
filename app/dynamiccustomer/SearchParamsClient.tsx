"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiPlus,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiFileText,
  FiEdit,
} from "react-icons/fi";

import "../globals.css";

export default function SearchParamsClient() {
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  // We can finally useSearchParams() here
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const [customer, setCustomer] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    lastCallDate: "",
    description: "",
  });

  // 1. Fetch customer details
  useEffect(() => {
    if (!customerId) return;
    const customerRef = doc(firestore, "customers", customerId);
    const unsubscribe = onSnapshot(customerRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCustomer({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        setCustomer(null);
      }
    });
    return () => unsubscribe();
  }, [customerId, firestore]);

  // 2. Listen for units reserved
  useEffect(() => {
    if (!customerId) return;
    const unitsRef = collection(firestore, "units");
    const unsubscribe = onSnapshot(
      unitsRef,
      (snapshot) => {
        const allUnits = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        const res = allUnits.filter(
          (unit) =>
            unit.reservation && unit.reservation.customerId === customerId
        );
        setReservations(res);
      },
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, [customerId, firestore]);

  // 3. Fetch available units when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    const unitsRef = collection(firestore, "units");
    const unsubscribe = onSnapshot(
      unitsRef,
      (snapshot) => {
        const allUnits = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        const available = allUnits.filter((unit) => !unit.reservation);
        setAvailableUnits(available);
      },
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, [modalOpen, firestore]);

  // 4. Reserve a unit
  async function handleReserveUnit(unit: any) {
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const unitRef = doc(firestore, "units", unit.id);
      await updateDoc(unitRef, {
        reservation: {
          customerId: customer.id,
          customerName: customer.name,
          reservedAt: new Date().toISOString(),
        },
      });
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error reserving unit:", err);
      setError("Failed to reserve unit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 5. Edit modal
  function openEditModal() {
    if (!customer) return;
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      lastCallDate: customer.lastCallDate || "",
      description: customer.description || "",
    });
    setEditModalOpen(true);
  }

  function handleEditChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const customerRef = doc(firestore, "customers", customer.id);
      await updateDoc(customerRef, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        lastCallDate: editForm.lastCallDate,
        description: editForm.description,
        updatedAt: new Date().toISOString(),
      });
      setEditModalOpen(false);
    } catch (err: any) {
      console.error("Error updating customer:", err);
      setError("Failed to update customer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 6. Handle no customerId or no data
  if (!customerId) {
    return (
      <div className="p-6">
        <p>Müşteri seçilmedi. (e.g. ?id=abc123)</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p>Müşteri bilgileri yükleniyor...</p>
      </div>
    );
  }

  // 7. Are we the owner?
  const currentUser = auth.currentUser;
  const isOwner = currentUser && customer.owner === currentUser.uid;

  // 8. Render everything
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {customer.name}
          </h1>
          {isOwner && (
            <button
              onClick={openEditModal}
              title="Müşteriyi düzenle"
              className="text-blue-500 hover:text-blue-700"
            >
              <FiEdit size={24} />
            </button>
          )}
        </div>

        {/* Customer Details */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {/* ... same as your code, e.g. email, phone, etc. */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2 flex-1 min-w-[120px]">
              <FiMail className="text-blue-500 mr-1" />
              <span className="text-gray-700 dark:text-gray-200 text-sm">
                {customer.email}
              </span>
            </div>
            {/* Etc... */}
          </div>
        </div>

        {/* Reservations */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Rezervasyonlar
            </h2>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
              title="Konut rezerve et"
            >
              <FiPlus size={20} />
            </button>
          </div>
          {reservations.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reservations.map((unit) => (
                <div key={unit.id} className="py-2 flex flex-col md:flex-row">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {unit.name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs">
                    {unit.project} – {unit.streetName} {unit.number}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Rezervasyon yok.
            </p>
          )}
        </div>
      </div>

      {/* Modal: List of Available Units */}
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10 w-full max-w-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Konut rezerve et
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-200 text-red-700 dark:text-red-800 rounded text-sm">
                  {error}
                </div>
              )}
              {loading && <p className="text-sm">İşleniyor...</p>}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {availableUnits.length > 0 ? (
                  availableUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleReserveUnit(unit)}
                    >
                      <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                        {unit.name}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">
                        {unit.project} – {unit.streetName} {unit.number}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 p-2 text-sm">
                    Uygun konut yok.
                  </p>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setEditModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10 w-full max-w-2xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Müşteri güncelle
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-200 text-red-700 dark:text-red-800 rounded text-sm">
                  {error}
                </div>
              )}
              {loading && <p className="text-sm">İşleniyor...</p>}
              <form onSubmit={handleSaveEdit} className="space-y-3">
                {/* ... etc ... */}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
