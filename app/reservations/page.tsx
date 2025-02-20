"use client";

import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import "../globals.css";

// Framer Motion for modal transitions
import { motion, AnimatePresence } from "framer-motion";
// React Icons for plus and trash icons
import { FiPlus, FiTrash2 } from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export default function ReservationsPage() {
  // State for units and customers
  const [units, setUnits] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  // State to control the reservation modal
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  // The unit that is currently selected for reservation
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State for current user id
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Listen for auth state changes to set currentUserId
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all units from Firestore
  useEffect(() => {
    const unitsRef = collection(firestore, "units");
    const unsubscribe = onSnapshot(
      unitsRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUnits(data);
      },
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, []);

  // Fetch all customers from Firestore
  useEffect(() => {
    const customersRef = collection(firestore, "customers");
    const unsubscribe = onSnapshot(
      customersRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(data);
      },
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, []);

  // Opens the reservation modal for a selected unit
  const openReservationModal = (unit: any) => {
    setSelectedUnit(unit);
    setReservationModalOpen(true);
  };

  // When a customer is selected, update the unit document with reservation info.
  const handleReserve = async (customer: any) => {
    if (!selectedUnit || !currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      const unitRef = doc(firestore, "units", selectedUnit.id);
      await updateDoc(unitRef, {
        reservation: {
          customerId: customer.id,
          customerName: customer.name,
          reservedAt: new Date().toISOString(),
          reservedBy: currentUserId, // Store the UID of the user who made the reservation
        },
      });
      setReservationModalOpen(false);
      setSelectedUnit(null);
    } catch (err: any) {
      console.error("Error reserving unit", err);
      setError("Failed to reserve unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // When the delete icon is clicked, remove the reservation
  const handleDeleteReservation = async (unit: any) => {
    setLoading(true);
    setError(null);
    try {
      const unitRef = doc(firestore, "units", unit.id);
      await updateDoc(unitRef, {
        reservation: null,
      });
    } catch (err: any) {
      console.error("Error deleting reservation", err);
      setError("Failed to delete reservation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          Rezervasyonlar
        </h1>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {/* Wrap table in a scrollable container for mobile view */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    İsim
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Proje
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Sokak ismi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Numara
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Rezervasyon
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {units.length > 0 ? (
                  units.map((unit) => (
                    <tr key={unit.id} className="whitespace-nowrap">
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {unit.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {unit.project}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {unit.streetName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {unit.number}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-center">
                        {unit.reservation ? (
                          <span className="text-green-600 font-semibold">
                            Rezerve edildi: {unit.reservation.customerName}
                          </span>
                        ) : (
                          <span className="text-gray-500">Rezervasyon yok</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-center">
                        {unit.reservation ? (
                          // Show the delete icon only if the current user made the reservation
                          currentUserId === unit.reservation.reservedBy ? (
                            <button
                              onClick={() => handleDeleteReservation(unit)}
                              title="Delete Reservation"
                              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          ) : null
                        ) : (
                          // If not reserved, show the plus icon to reserve.
                          <button
                            onClick={() => openReservationModal(unit)}
                            title="Reserve Unit"
                            className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
                          >
                            <FiPlus size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      Konut bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reservation Modal: List of Customers */}
      <AnimatePresence>
        {reservationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            {/* Dimmed Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black"
              onClick={() => setReservationModalOpen(false)}
            ></motion.div>
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Müşteri seç
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-200 text-red-700 dark:text-red-800 rounded">
                  {error}
                </div>
              )}
              <div className="max-h-80 overflow-y-auto">
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
                      onClick={() => handleReserve(customer)}
                    >
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {customer.name}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {customer.email}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Müşteri bulunamadı.
                  </p>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setReservationModalOpen(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
