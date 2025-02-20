"use client";

import { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import "../globals.css";

// Import Framer Motion components
import { motion, AnimatePresence } from "framer-motion";
// Import React Icons (Feather Icons)
import { FiEdit, FiTrash2, FiMessageSquare } from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export default function UnitsPage() {
  // State for units data and modal/form handling
  const [units, setUnits] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    project: "",
    streetName: "",
    number: "",
    description: "",
  });
  // For tooltip: track which unit’s description is being shown
  const [tooltipUnitId, setTooltipUnitId] = useState<string | null>(null);
  // Ref for the tooltip bubble to handle outside clicks
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Listen to the "units" collection in Firestore
  useEffect(() => {
    const unitsRef = collection(firestore, "units");
    const unsubscribe = onSnapshot(
      unitsRef,
      (snapshot) => {
        const unitsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUnits(unitsData);
      },
      (err) => {
        console.error(err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Close tooltip when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipUnitId &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setTooltipUnitId(null);
      }
    };
    if (tooltipUnitId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [tooltipUnitId]);

  // Update form state for text inputs and textareas
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save (add or update) a unit in Firestore
  const handleSaveUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to perform this action.");
        setLoading(false);
        return;
      }
      if (!selectedUnit) {
        // Adding a new unit
        await addDoc(collection(firestore, "units"), {
          name: form.name,
          project: form.project,
          streetName: form.streetName,
          number: form.number,
          description: form.description,
          owner: user.uid,
          ownerName: user.displayName || user.email || "Unknown",
          createdAt: new Date().toISOString(),
        });
      } else {
        // Updating an existing unit
        const unitRef = doc(firestore, "units", selectedUnit.id);
        await updateDoc(unitRef, {
          name: form.name,
          project: form.project,
          streetName: form.streetName,
          number: form.number,
          description: form.description,
          updatedAt: new Date().toISOString(),
        });
      }
      // Reset form and close modal
      setForm({
        name: "",
        project: "",
        streetName: "",
        number: "",
        description: "",
      });
      setSelectedUnit(null);
      setModalOpen(false);
    } catch (error: any) {
      console.error("Error saving unit:", error);
      setError("Failed to save unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill form and open modal for editing a unit
  const handleEditUnit = (unit: any) => {
    setSelectedUnit(unit);
    setForm({
      name: unit.name || "",
      project: unit.project || "",
      streetName: unit.streetName || "",
      number: unit.number || "",
      description: unit.description || "",
    });
    setModalOpen(true);
  };

  // Delete a unit with confirmation
  const handleDeleteUnit = async (unit: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${unit.name}?`
    );
    if (confirmDelete) {
      try {
        await deleteDoc(doc(firestore, "units", unit.id));
      } catch (error: any) {
        console.error("Error deleting unit:", error);
        alert("Failed to delete unit. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Konutlar
          </h1>
          <button
            onClick={() => {
              setSelectedUnit(null);
              setForm({
                name: "",
                project: "",
                streetName: "",
                number: "",
                description: "",
              });
              setModalOpen(true);
            }}
            className="bg-blue-500 text-white px-5 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            + Konut Ekle
          </button>
        </div>

        {/* Units Table */}
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
                    Sokak İsmi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Numara
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
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 flex items-center">
                        {/* Show green circle if unit is reserved */}
                        {unit.reservation && (
                          <span className="inline-block w-3 h-3 mr-2 bg-green-500 rounded-full"></span>
                        )}
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
                        <div className="flex items-center justify-center space-x-2">
                          {/* Show description tooltip icon if description exists */}
                          {unit.description && (
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTooltipUnitId(
                                    tooltipUnitId === unit.id ? null : unit.id
                                  );
                                }}
                                title="View Description"
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <FiMessageSquare size={20} />
                              </button>
                              <AnimatePresence>
                                {tooltipUnitId === unit.id && (
                                  <motion.div
                                    ref={tooltipRef}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-2 z-50 max-w-[350px] whitespace-normal"
                                  >
                                    {unit.description}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                          {/* Only show edit and delete icons if the current user is the owner */}
                          {auth.currentUser &&
                            unit.owner === auth.currentUser.uid && (
                              <>
                                <button
                                  onClick={() => handleEditUnit(unit)}
                                  title="Konut Güncelle"
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <FiEdit size={20} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUnit(unit)}
                                  title="Konut Sil"
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <FiTrash2 size={20} />
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
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

      {/* Modal for Adding/Editing Unit */}
      <AnimatePresence>
        {modalOpen && (
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
              onClick={() => {
                setModalOpen(false);
                setSelectedUnit(null);
              }}
            ></motion.div>
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-2xl"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {selectedUnit ? "Konut Güncelle" : "Konut Ekle"}
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              <form onSubmit={handleSaveUnit} className="space-y-4">
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
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Proje
                  </label>
                  <input
                    type="text"
                    name="project"
                    value={form.project}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Sokak ismi
                  </label>
                  <input
                    type="text"
                    name="streetName"
                    value={form.streetName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Numara
                  </label>
                  <input
                    type="text"
                    name="number"
                    value={form.number}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Açıklama
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setSelectedUnit(null);
                    }}
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
                      ? selectedUnit
                        ? "Güncelleniyor..."
                        : "Ekleniyor..."
                      : selectedUnit
                      ? "Konut Güncelle"
                      : "Konut Ekle"}
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
