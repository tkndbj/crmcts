"use client";

import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import "../globals.css";

import { motion, AnimatePresence } from "framer-motion";

// React Icons
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiHome,
  FiClipboard,
  FiEdit,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

type EditCategory = "customers" | "units" | "reservations" | null;

export default function ProfilePage() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data collections
  const [myCustomers, setMyCustomers] = useState<any[]>([]);
  const [myUnits, setMyUnits] = useState<any[]>([]);
  const [myReservations, setMyReservations] = useState<any[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For selection modal & editing
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<EditCategory>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<any>(null);

  // Edit modals for customers and units (declared only once)
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    lastCallDate: "",
    description: "",
  });
  const [unitEditForm, setUnitEditForm] = useState({
    name: "",
    project: "",
    streetName: "",
    number: "",
    description: "",
  });

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch customers and units added by current user
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    // Customers added by current user
    const custRef = collection(firestore, "customers");
    const qCust = query(custRef, where("owner", "==", currentUser.uid));
    const unsubscribeCust = onSnapshot(
      qCust,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...((doc.data() as any) || {}),
        }));
        setMyCustomers(data);
      },
      (err) => {
        console.error("Error fetching customers:", err);
        setError("Failed to fetch customers.");
      }
    );

    // Units added by current user
    const unitRef = collection(firestore, "units");
    const qUnit = query(unitRef, where("owner", "==", currentUser.uid));
    const unsubscribeUnit = onSnapshot(
      qUnit,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...((doc.data() as any) || {}),
        }));
        setMyUnits(data);
      },
      (err) => {
        console.error("Error fetching units:", err);
        setError("Failed to fetch units.");
      }
    );

    // Reservations: units with a reservation whose customerId is in myCustomers.
    let unsubscribeRes: () => void = () => {};
    if (myCustomers.length > 0) {
      const custIds = myCustomers.map((c) => c.id);
      const resRef = collection(firestore, "units");
      if (custIds.length <= 10) {
        const qRes = query(
          resRef,
          where("reservation.customerId", "in", custIds)
        );
        unsubscribeRes = onSnapshot(
          qRes,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...((doc.data() as any) || {}),
            }));
            setMyReservations(data);
          },
          (err) => {
            console.error("Error fetching reservations:", err);
            setError("Failed to fetch reservations.");
          }
        );
      } else {
        const qRes = query(resRef, where("reservation", "!=", null));
        unsubscribeRes = onSnapshot(
          qRes,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...((doc.data() as any) || {}),
            }));
            const filtered = data.filter(
              (unit) =>
                unit.reservation &&
                custIds.includes(unit.reservation.customerId)
            );
            setMyReservations(filtered);
          },
          (err) => {
            console.error("Error fetching reservations:", err);
            setError("Failed to fetch reservations.");
          }
        );
      }
    } else {
      setMyReservations([]);
    }
    setLoading(false);
    return () => {
      unsubscribeCust();
      unsubscribeUnit();
      unsubscribeRes();
    };
  }, [currentUser, myCustomers.length]);

  if (!currentUser) {
    return (
      <div className="p-6">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  // Only show edit icons if current user is the owner (they added these items)
  const isOwner =
    currentUser && myCustomers.some((c) => c.owner === currentUser.uid);

  // Helper to open the selection modal for a category.
  const openSelectionModal = (category: EditCategory) => {
    setEditCategory(category);
    setSelectionModalOpen(true);
  };

  // When an item is picked from the selection modal:
  const handleSelection = (item: any) => {
    setSelectedItemForEdit(item);
    setSelectionModalOpen(false);
    if (editCategory === "customers") {
      setCustomerEditForm({
        name: item.name || "",
        email: item.email || "",
        phone: item.phone || "",
        address: item.address || "",
        lastCallDate: item.lastCallDate || "",
        description: item.description || "",
      });
      setEditCustomerModalOpen(true);
    } else if (editCategory === "units") {
      setUnitEditForm({
        name: item.name || "",
        project: item.project || "",
        streetName: item.streetName || "",
        number: item.number || "",
        description: item.description || "",
      });
      setEditUnitModalOpen(true);
    }
    // For reservations, we don't open an edit modal; deletion is managed in the selection modal.
  };

  // Delete a reservation by setting its reservation field to null.
  const handleDeleteReservation = async (unit: any) => {
    try {
      const unitRef = doc(firestore, "units", unit.id);
      await updateDoc(unitRef, { reservation: null });
    } catch (err) {
      console.error("Error deleting reservation:", err);
      setError("Failed to delete reservation.");
    }
  };

  const handleCustomerEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setCustomerEditForm({
      ...customerEditForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveCustomerEdit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    try {
      const custRef = doc(firestore, "customers", selectedItemForEdit.id);
      await updateDoc(custRef, {
        name: customerEditForm.name,
        email: customerEditForm.email,
        phone: customerEditForm.phone,
        address: customerEditForm.address,
        lastCallDate: customerEditForm.lastCallDate,
        description: customerEditForm.description,
        updatedAt: new Date().toISOString(),
      });
      setEditCustomerModalOpen(false);
    } catch (err) {
      console.error("Error updating customer:", err);
      setError("Failed to update customer.");
    }
  };

  const handleUnitEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setUnitEditForm({ ...unitEditForm, [e.target.name]: e.target.value });
  };

  const handleSaveUnitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const unitRef = doc(firestore, "units", selectedItemForEdit.id);
      await updateDoc(unitRef, {
        name: unitEditForm.name,
        project: unitEditForm.project,
        streetName: unitEditForm.streetName,
        number: unitEditForm.number,
        description: unitEditForm.description,
        updatedAt: new Date().toISOString(),
      });
      setEditUnitModalOpen(false);
    } catch (err) {
      console.error("Error updating unit:", err);
      setError("Failed to update unit.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <FiUser className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentUser.displayName || "Profile"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customers Added */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 relative">
            <div className="flex items-center space-x-2">
              <FiUsers className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Müşteriler
              </h2>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-gray-100">
              {myCustomers.length}
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">
              Eklediğiniz müşteri sayısı
            </p>
          </div>
          {/* Units Added */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 relative">
            <div className="flex items-center space-x-2">
              <FiHome className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Konutlar
              </h2>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-gray-100">
              {myUnits.length}
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">
              Eklediğiniz konut sayısı
            </p>
          </div>
          {/* Reservations Made */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 relative">
            <div className="flex items-center space-x-2">
              <FiClipboard className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Rezervasyonlar
              </h2>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-gray-100">
              {myReservations.length}
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">
              Yaptığınız rezervasyon sayısı
            </p>
          </div>
        </div>

        {/* Detailed Lists */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Detaylar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customers Details */}
            <div className="relative p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <button
                className="absolute top-1 right-1"
                onClick={() => openSelectionModal("customers")}
                title="Edit Customers"
              >
                <FiEdit className="text-blue-500" size={18} />
              </button>
              <h3 className="text-gray-700 dark:text-gray-200 font-semibold text-sm">
                Müşteriler
              </h3>
              {myCustomers.length > 0 ? (
                myCustomers.map((c) => (
                  <div key={c.id}>
                    <p className="text-gray-700 dark:text-gray-200 font-semibold text-xs truncate">
                      {c.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate">
                      {c.email}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Eklenen müşteri yok.
                </p>
              )}
            </div>
            {/* Units Details */}
            <div className="relative p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <button
                className="absolute top-1 right-1"
                onClick={() => openSelectionModal("units")}
                title="Edit Konutlar"
              >
                <FiEdit className="text-blue-500" size={18} />
              </button>
              <h3 className="text-gray-700 dark:text-gray-200 font-semibold text-sm">
                Konutlar
              </h3>
              {myUnits.length > 0 ? (
                myUnits.map((u) => (
                  <div key={u.id} className="mb-1">
                    <p className="text-gray-700 dark:text-gray-200 font-semibold text-xs truncate">
                      {u.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate">
                      {u.project}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate">
                      {u.streetName} {u.number}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Eklenen konut yok.
                </p>
              )}
            </div>
            {/* Reservations Details */}
            <div className="relative p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <button
                className="absolute top-1 right-1"
                onClick={() => openSelectionModal("reservations")}
                title="Manage Rezervasyonlar"
              >
                <FiEdit className="text-blue-500" size={18} />
              </button>
              <h3 className="text-gray-700 dark:text-gray-200 font-semibold text-sm">
                Rezervasyonlar
              </h3>
              {myReservations.length > 0 ? (
                myReservations.map((r) => (
                  <div key={r.id} className="mb-1">
                    <p className="text-gray-700 dark:text-gray-200 font-semibold text-xs truncate">
                      {r.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      {r.project} – {r.streetName} {r.number}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      Rezerve edilen tarih:{" "}
                      {r.reservation?.reservedAt &&
                        new Date(r.reservation.reservedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-xs">
                  Rezervasyon yapılmamış.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selection Modal */}
      <AnimatePresence>
        {selectionModalOpen && editCategory && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setSelectionModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {editCategory === "reservations"
                  ? "Rezervasyonları Yönet"
                  : `Düzenlenecek ${
                      editCategory === "customers" ? "Müşteriyi" : "Konutu"
                    } Seçin`}
              </h2>
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {editCategory === "customers" &&
                  myCustomers.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSelection(item)}
                    >
                      <p className="text-gray-700 dark:text-gray-200 text-sm truncate">
                        {item.name} - {item.email}
                      </p>
                    </div>
                  ))}
                {editCategory === "units" &&
                  myUnits.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSelection(item)}
                    >
                      <p className="text-gray-700 dark:text-gray-200 text-sm truncate">
                        {item.name} - {item.project}
                      </p>
                    </div>
                  ))}
                {editCategory === "reservations" &&
                  myReservations.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div>
                        <p className="text-gray-700 dark:text-gray-200 text-sm truncate">
                          {item.name} - {item.project}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-xs">
                          {item.reservation?.reservedAt &&
                            new Date(
                              item.reservation.reservedAt
                            ).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteReservation(item)}
                        title="Rezervasyonu sil"
                      >
                        <FiTrash2 className="text-red-500" size={18} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setSelectionModalOpen(false)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editCustomerModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setEditCustomerModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10 w-full max-w-2xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Müşteriyi Düzenle
              </h2>
              <form onSubmit={handleSaveCustomerEdit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    İsim
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={customerEditForm.name}
                    onChange={handleCustomerEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    E-posta
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={customerEditForm.email}
                    onChange={handleCustomerEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Numara
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={customerEditForm.phone}
                    onChange={handleCustomerEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Adres
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={customerEditForm.address}
                    onChange={handleCustomerEditChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Son Arama Tarihi
                  </label>
                  <input
                    type="text"
                    name="lastCallDate"
                    placeholder="DD/MM/YYYY"
                    value={customerEditForm.lastCallDate}
                    onChange={handleCustomerEditChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Açıklama
                  </label>
                  <textarea
                    name="description"
                    value={customerEditForm.description}
                    onChange={handleCustomerEditChange}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setEditCustomerModalOpen(false)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Unit Modal */}
      <AnimatePresence>
        {editUnitModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setEditUnitModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10 w-full max-w-2xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Konutu Düzenle
              </h2>
              <form onSubmit={handleSaveUnitEdit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    İsim
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={unitEditForm.name}
                    onChange={handleUnitEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Proje
                  </label>
                  <input
                    type="text"
                    name="project"
                    value={unitEditForm.project}
                    onChange={handleUnitEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Sokak Adı
                  </label>
                  <input
                    type="text"
                    name="streetName"
                    value={unitEditForm.streetName}
                    onChange={handleUnitEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Numara
                  </label>
                  <input
                    type="text"
                    name="number"
                    value={unitEditForm.number}
                    onChange={handleUnitEditChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Açıklama
                  </label>
                  <textarea
                    name="description"
                    value={unitEditForm.description}
                    onChange={handleUnitEditChange}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setEditUnitModalOpen(false)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
