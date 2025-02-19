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
import { useRouter } from "next/navigation";
// Import Framer Motion components
import { motion, AnimatePresence } from "framer-motion";
// Import React Icons (Feather Icons)
import { FiEdit, FiTrash2, FiMessageSquare, FiUser } from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Helper to format a string of digits into DD/MM/YYYY as user types */
function formatDDMMYYYY(value: string) {
  // Keep only digits
  let digits = value.replace(/\D/g, "");
  // Ensure max length of 8 digits
  if (digits.length > 8) digits = digits.slice(0, 8);

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let formatted = day;
  if (month) {
    formatted += "/" + month;
  }
  if (year) {
    formatted += "/" + year;
  }
  return formatted;
}

export default function CustomersPage() {
  const router = useRouter(); // Moved inside component

  // State for customer data and modal/form handling
  const [customers, setCustomers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    lastCallDate: "", // New field
    description: "",
  });
  // For tooltip: track which customer’s description is being shown
  const [tooltipCustomerId, setTooltipCustomerId] = useState<string | null>(
    null
  );
  // Ref for the tooltip bubble to handle outside clicks
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Tab state: "genel" (all customers) or "kendi" (current user's customers)
  const [activeTab, setActiveTab] = useState<"genel" | "kendi">("genel");

  // New state for Customer Information Modal
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<any>(null);

  // Fetch customers live
  useEffect(() => {
    const customersRef = collection(firestore, "customers");
    const unsubscribe = onSnapshot(
      customersRef,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(customersData);
      },
      (err) => {
        console.error(err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Set up a document click listener to close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipCustomerId &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setTooltipCustomerId(null);
      }
    };
    if (tooltipCustomerId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [tooltipCustomerId]);

  // Update form state (generic for most fields)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Special handler for Last Call Date to auto-insert slashes
  const handleLastCallDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      lastCallDate: formatDDMMYYYY(e.target.value),
    });
  };

  // Called when the form is submitted (for both add and edit)
  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
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

      if (!selectedCustomer) {
        // Include ownerName from the current user's displayName/email/fallback
        await addDoc(collection(firestore, "customers"), {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          lastCallDate: form.lastCallDate, // Store new field
          description: form.description,
          owner: user.uid, // Set owner to current user's UID
          ownerName: user.displayName || user.email || "Unknown",
          createdAt: new Date().toISOString(),
        });
      } else {
        const customerRef = doc(firestore, "customers", selectedCustomer.id);
        await updateDoc(customerRef, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          lastCallDate: form.lastCallDate, // Update field
          description: form.description,
          updatedAt: new Date().toISOString(),
        });
      }
      // Reset form and close modal
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        lastCallDate: "",
        description: "",
      });
      setSelectedCustomer(null);
      setModalOpen(false);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      setError("Failed to save customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Open modal for editing a customer (pre-fill form)
  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      lastCallDate: customer.lastCallDate || "",
      description: customer.description || "",
    });
    setModalOpen(true);
  };

  // Delete customer with confirmation
  const handleDeleteCustomer = async (customer: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${customer.name}?`
    );
    if (confirmDelete) {
      try {
        await deleteDoc(doc(firestore, "customers", customer.id));
      } catch (error: any) {
        console.error("Error deleting customer:", error);
        alert("Failed to delete customer. Please try again.");
      }
    }
  };

  // Determine if the current user is the owner of the customer
  const isOwner = (customer: any) => {
    const user = auth.currentUser;
    return user && customer.owner === user.uid;
  };

  // New function: Handle clicking on a customer name to show customer information modal
  const handleCustomerInfo = (customer: any) => {
    setSelectedCustomerInfo(customer);
    setCustomerInfoModalOpen(true);
  };

  // Filter customers based on activeTab
  const displayedCustomers =
    activeTab === "genel"
      ? customers
      : customers.filter((customer) => isOwner(customer));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("genel")}
              className={`px-4 py-2 rounded-t-lg border-b-2 ${
                activeTab === "genel"
                  ? "border-blue-500 text-blue-500 font-semibold"
                  : "border-transparent text-gray-500 dark:text-gray-400"
              }`}
            >
              Genel
            </button>
            <button
              onClick={() => setActiveTab("kendi")}
              className={`px-4 py-2 rounded-t-lg border-b-2 ${
                activeTab === "kendi"
                  ? "border-blue-500 text-blue-500 font-semibold"
                  : "border-transparent text-gray-500 dark:text-gray-400"
              }`}
            >
              Kendi müşterilerim
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setForm({
                name: "",
                email: "",
                phone: "",
                address: "",
                lastCallDate: "",
                description: "",
              });
              setModalOpen(true);
            }}
            className="bg-blue-500 text-white px-5 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            + Add Customer
          </button>
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayedCustomers.length > 0 ? (
                displayedCustomers.map((customer) => (
                  <tr key={customer.id} className="whitespace-nowrap">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {/* Clicking the customer name opens the customer info modal */}
                      <span
                        onClick={() => handleCustomerInfo(customer)}
                        className="cursor-pointer hover:text-blue-500"
                      >
                        {customer.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {customer.email}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {customer.address}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-center">
                      {isOwner(customer) && (
                        <div className="flex items-center justify-center space-x-2">
                          {/* Note Icon appears first if description exists */}
                          {customer.description && (
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTooltipCustomerId(
                                    tooltipCustomerId === customer.id
                                      ? null
                                      : customer.id
                                  );
                                }}
                                title="View Description"
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <FiMessageSquare size={20} />
                              </button>
                              <AnimatePresence>
                                {tooltipCustomerId === customer.id && (
                                  <motion.div
                                    ref={tooltipRef}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-2 z-50 w-auto max-w-[400px] whitespace-normal"
                                  >
                                    {customer.description}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                          {/* Edit Icon */}
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            title="Edit Customer"
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <FiEdit size={20} />
                          </button>
                          {/* Delete Icon */}
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            title="Delete Customer"
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <FiTrash2 size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Modal for Adding/Editing Customer */}
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
                setSelectedCustomer(null);
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
                {selectedCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Name
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
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Phone
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                {/* New Field: Last Call Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Last call date
                  </label>
                  <input
                    type="text"
                    name="lastCallDate"
                    placeholder="DD/MM/YYYY"
                    value={form.lastCallDate}
                    onChange={handleLastCallDateChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setSelectedCustomer(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    {loading
                      ? selectedCustomer
                        ? "Updating..."
                        : "Adding..."
                      : selectedCustomer
                      ? "Update Customer"
                      : "Add Customer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Information Modal */}
      <AnimatePresence>
        {customerInfoModalOpen && selectedCustomerInfo && (
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
              onClick={() => setCustomerInfoModalOpen(false)}
            ></motion.div>
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
            >
              {/* Profile Icon Button on Top Right */}
              <button
                onClick={() =>
                  router.push(`/dynamiccustomer?id=${selectedCustomerInfo.id}`)
                }
                className="absolute top-4 right-4"
              >
                <FiUser size={24} className="text-blue-500" />
              </button>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Customer Information
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Name:</strong> {selectedCustomerInfo.name}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Email:</strong> {selectedCustomerInfo.email}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Phone:</strong> {selectedCustomerInfo.phone}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Address:</strong> {selectedCustomerInfo.address}
              </p>
              {selectedCustomerInfo.description && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Description:</strong>{" "}
                  {selectedCustomerInfo.description}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                <strong>Added by:</strong>{" "}
                {selectedCustomerInfo.ownerName
                  ? selectedCustomerInfo.ownerName
                  : "Unknown"}
              </p>
              {/* Show Last Call Date if it exists */}
              {selectedCustomerInfo.lastCallDate && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Last call date:</strong>{" "}
                  {selectedCustomerInfo.lastCallDate}
                </p>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setCustomerInfoModalOpen(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
