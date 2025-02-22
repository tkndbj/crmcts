"use client";

import Script from "next/script";
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
import { FiEdit, FiTrash2, FiUser, FiMail, FiFileText } from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Helper: Convert an input string to DD/MM/YYYY format */
function formatDDMMYYYY(value: string) {
  let digits = value.replace(/\D/g, "");
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

/** Helper: Check if the current user is the owner of a customer */
function isOwner(customer: any) {
  const user = auth.currentUser;
  return user && customer.owner === user.uid;
}

/** Helper: Force a text to lowercase except the first character */
function capitalizeSentence(text: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function CustomersPage() {
  const router = useRouter();

  // (Optional) Load a custom font if you're still using it somewhere
  return (
    <>
      <Script
        src="/fonts/Roboto_Condensed-Medium-normal.js"
        strategy="afterInteractive"
      />
      <CustomersPageContent />
    </>
  );
}

function CustomersPageContent() {
  const router = useRouter();

  // State for customers, modals, forms, etc.
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
    lastCallDate: "",
    description: "",
  });
  const [tooltipCustomerId, setTooltipCustomerId] = useState<string | null>(
    null
  );
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"genel" | "kendi">("genel");
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<any>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEmailCustomer, setSelectedEmailCustomer] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Fetch customers live with caching
  useEffect(() => {
    const cachedData = localStorage.getItem("customersCache");
    if (cachedData) {
      setCustomers(JSON.parse(cachedData));
    }
    const customersRef = collection(firestore, "customers");
    const unsubscribe = onSnapshot(
      customersRef,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(customersData);
        localStorage.setItem("customersCache", JSON.stringify(customersData));
      },
      (err) => {
        console.error(err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen for clicks outside tooltip
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

  // Update form state
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Special handler for last call date input
  const handleLastCallDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      lastCallDate: formatDDMMYYYY(e.target.value),
    });
  };

  // Handle add/update customer form submit
  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Bu işlemi yapmak için giriş yapmış olmanız gerekir.");
        setLoading(false);
        return;
      }
      if (!selectedCustomer) {
        await addDoc(collection(firestore, "customers"), {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          lastCallDate: form.lastCallDate,
          description: form.description,
          owner: user.uid,
          ownerName: user.displayName || user.email || "Bilinmiyor",
          createdAt: new Date().toISOString(),
        });
      } else {
        const customerRef = doc(firestore, "customers", selectedCustomer.id);
        await updateDoc(customerRef, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          lastCallDate: form.lastCallDate,
          description: form.description,
          updatedAt: new Date().toISOString(),
        });
      }
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
      console.error("Müşteri kaydedilirken hata:", error);
      setError("Müşteri kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // Open edit customer modal
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
      `${customer.name} adlı müşteriyi silmek istediğinize emin misiniz?`
    );
    if (confirmDelete) {
      try {
        await deleteDoc(doc(firestore, "customers", customer.id));
      } catch (error: any) {
        console.error("Müşteri silinirken hata:", error);
        alert("Müşteri silinemedi. Lütfen tekrar deneyin.");
      }
    }
  };

  // Open customer info modal
  const handleCustomerInfo = (customer: any) => {
    setSelectedCustomerInfo(customer);
    setCustomerInfoModalOpen(true);
  };

  // Open email modal
  const handleEmailIconClick = (customer: any) => {
    // Checking if user has Google cookie
    if (!document.cookie.includes("google-authenticated=true")) {
      window.location.href = "/api/auth/google";
      return;
    }
    setSelectedEmailCustomer(customer);
    setEmailSubject("");
    setEmailMessage("");
    setEmailModalOpen(true);
  };

  // Handle sending email
  const handleSendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSending(true);
    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: selectedEmailCustomer.email,
          subject: emailSubject,
          message: emailMessage,
        }),
      });
      if (!response.ok) {
        throw new Error("E-posta gönderilemedi");
      }
      setEmailModalOpen(false);
      setSelectedEmailCustomer(null);
      setEmailSubject("");
      setEmailMessage("");
    } catch (err: any) {
      console.error("E-posta gönderilirken hata:", err);
      setEmailError(err.message || "E-posta gönderilirken hata oluştu");
    } finally {
      setEmailSending(false);
    }
  };

  /**
   * Handle PDF generation via Puppeteer route
   */
  const handleGenerateReport = async (option: "user" | "all") => {
    setReportLoading(true);
    try {
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid;
      // If "all", we'll pass 'all'. If "user", we'll pass the current user's UID (or 'all' if not available).
      const ownerParam = option === "all" ? "all" : uid || "all";
      // Simply open in a new tab:
      window.open(`/api/generate-report?owner=${ownerParam}`, "_blank");

      // OR, if you prefer prompting download without a new tab:
      /*
      const response = await fetch(`/api/generate-report?owner=${ownerParam}`);
      if (!response.ok) {
        throw new Error("PDF oluşturulamadı");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "report.pdf";
      link.click();
      */
    } catch (error) {
      console.error("Rapor oluşturulurken hata:", error);
    } finally {
      setReportLoading(false);
      setReportModalOpen(false);
    }
  };

  // Filter customers based on active tab
  const displayedCustomers =
    activeTab === "genel"
      ? customers
      : customers.filter((customer) => {
          const user = auth.currentUser;
          return user && customer.owner === user.uid;
        });

  return (
    <>
      {/* If you're not using a custom PDF font client-side, you can remove this Script. */}
      <Script
        src="/fonts/Roboto_Condensed-Medium-normal.js"
        strategy="afterInteractive"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Top tabs */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Müşteriler
          </h1>
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
                Kendi Müşterilerim
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setReportModalOpen(true)}
                className="border border-blue-500 text-blue-500 px-4 py-2 rounded-full bg-transparent hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <FiFileText size={18} />
                <span>Rapor Çıkar</span>
              </button>
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
                Müşteri Ekle
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      İsim
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      E-posta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Adres
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedCustomers.length > 0 ? (
                    displayedCustomers.map((customer) => (
                      <tr key={customer.id} className="whitespace-nowrap">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          <span
                            onClick={() => handleCustomerInfo(customer)}
                            className="cursor-pointer hover:text-blue-500"
                          >
                            {customer.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailIconClick(customer);
                            }}
                            title="E-posta Gönder"
                            className="text-green-500 hover:text-green-700 transition-colors"
                          >
                            <FiMail size={20} />
                          </button>
                          <span>{customer.email}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {customer.phone}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {customer.address}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {isOwner(customer) && (
                              <>
                                <button
                                  onClick={() => handleEditCustomer(customer)}
                                  title="Müşteriyi Düzenle"
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <FiEdit size={20} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(customer)}
                                  title="Müşteriyi Sil"
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
                        Müşteri bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Add/Edit Modal */}
        <AnimatePresence>
          {modalOpen && (
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
                onClick={() => {
                  setModalOpen(false);
                  setSelectedCustomer(null);
                }}
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
                <form onSubmit={handleSaveCustomer} className="space-y-4">
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
                      Son Arama Tarihi
                    </label>
                    <input
                      type="text"
                      name="lastCallDate"
                      placeholder="GG/AA/YYYY"
                      value={form.lastCallDate}
                      onChange={handleLastCallDateChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
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

        {/* Customer Info Modal */}
        <AnimatePresence>
          {customerInfoModalOpen && selectedCustomerInfo && (
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
                onClick={() => setCustomerInfoModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <button
                  onClick={() =>
                    router.push(
                      `/dynamiccustomer?id=${selectedCustomerInfo.id}`
                    )
                  }
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
                  <strong>İsim:</strong> {selectedCustomerInfo.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>E-posta:</strong> {selectedCustomerInfo.email}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Telefon:</strong> {selectedCustomerInfo.phone}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Adres:</strong> {selectedCustomerInfo.address}
                </p>
                {selectedCustomerInfo.lastCallDate && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Son Arama Tarihi:</strong>{" "}
                    {selectedCustomerInfo.lastCallDate}
                  </p>
                )}
                {selectedCustomerInfo.description && (
                  <div className="bg-gray-100 p-2 rounded text-gray-700 dark:text-gray-300 mt-2">
                    {selectedCustomerInfo.description}
                  </div>
                )}
                <p className="text-gray-700 dark:text-gray-300 mt-4">
                  <strong>Ekleyen:</strong>{" "}
                  {selectedCustomerInfo.ownerName
                    ? selectedCustomerInfo.ownerName
                    : "Bilinmiyor"}
                </p>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setCustomerInfoModalOpen(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Modal */}
        <AnimatePresence>
          {emailModalOpen && selectedEmailCustomer && (
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
                onClick={() => setEmailModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  E-posta Gönder
                </h2>
                {emailError && (
                  <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                    {emailError}
                  </div>
                )}
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Gönderen:
                    </label>
                    <input
                      type="email"
                      value={auth.currentUser?.email || ""}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Kime:
                    </label>
                    <input
                      type="email"
                      value={selectedEmailCustomer.email}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Konu:
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Mesaj:
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      required
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={emailSending}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      {emailSending ? "Gönderiliyor..." : "E-posta Gönder"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Selection Modal */}
        <AnimatePresence>
          {reportModalOpen && (
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
                onClick={() => setReportModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  Rapor Seçimi
                </h2>
                {reportLoading ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-blue-500">
                      Rapor hazırlanıyor...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <button
                      onClick={() => handleGenerateReport("user")}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Kendi müşterilerim için
                    </button>
                    <button
                      onClick={() => handleGenerateReport("all")}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Tüm müşteriler için
                    </button>
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
