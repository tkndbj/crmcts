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
import { FiEdit, FiTrash2, FiClipboard, FiUser, FiMail } from "react-icons/fi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/** Yardımcı: Kullanıcının girdiği rakamları DD/MM/YYYY biçimine dönüştürür */
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

/** Yardımcı: Mevcut kullanıcının müşterinin sahibi olup olmadığını kontrol eder */
function isOwner(customer: any) {
  const user = auth.currentUser;
  return user && customer.owner === user.uid;
}

export default function CustomersPage() {
  const router = useRouter();

  // Müşteri verileri ve modal/form işlemleri için state
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
  // Tooltip için: Hangi müşterinin açıklaması gösteriliyor?
  const [tooltipCustomerId, setTooltipCustomerId] = useState<string | null>(
    null
  );
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Sekme durumu: "genel" (tüm müşteriler) veya "kendi" (sadece kullanıcının müşterileri)
  const [activeTab, setActiveTab] = useState<"genel" | "kendi">("genel");

  // Müşteri Bilgileri Modal state
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<any>(null);

  // E-posta Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEmailCustomer, setSelectedEmailCustomer] = useState<any>(null);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Müşterileri canlı olarak getir with caching mechanism
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

  // Tooltip için dış tıklamayı dinle
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

  // Form state güncelleme
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Last Call Date için özel handler
  const handleLastCallDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      lastCallDate: formatDDMMYYYY(e.target.value),
    });
  };

  // Müşteri ekleme/düzenleme formu gönderildiğinde
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

  // Müşteri düzenleme modalını aç
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

  // Müşteriyi sil (onay ile)
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

  // Müşteri bilgileri modalını aç
  const handleCustomerInfo = (customer: any) => {
    setSelectedCustomerInfo(customer);
    setCustomerInfoModalOpen(true);
  };

  // E-posta modalını aç
  const handleEmailIconClick = (customer: any) => {
    // Check if authentication flag exists; if not, redirect for one-time auth.
    if (!document.cookie.includes("google-authenticated=true")) {
      window.location.href = "/api/auth/google";
      return;
    }
    setSelectedEmailCustomer(customer);
    setEmailMessage("");
    setEmailModalOpen(true);
  };

  // E-posta gönderme işlemi
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
          message: emailMessage,
          subject: "CRMCTS'ten Mesaj",
        }),
      });
      if (!response.ok) {
        throw new Error("E-posta gönderilemedi");
      }
      setEmailModalOpen(false);
      setSelectedEmailCustomer(null);
      setEmailMessage("");
    } catch (err: any) {
      console.error("E-posta gönderilirken hata:", err);
      setEmailError(err.message || "E-posta gönderilirken hata oluştu");
    } finally {
      setEmailSending(false);
    }
  };

  // Filtreleme: aktif sekmeye göre müşteri listesi
  const displayedCustomers =
    activeTab === "genel"
      ? customers
      : customers.filter((customer) => {
          const user = auth.currentUser;
          return user && customer.owner === user.uid;
        });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Üst Kısım – Sekmeler */}
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

        {/* Müşteriler Tablosu */}
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
                          {/* Not (Açıklama) İkonu – her zaman göster */}
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
                              title="Notu Gör"
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <FiClipboard size={20} />
                            </button>
                            <AnimatePresence>
                              {tooltipCustomerId === customer.id && (
                                <motion.div
                                  ref={tooltipRef}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-2 z-50 w-auto max-w-[600px] whitespace-normal"
                                >
                                  {customer.description || "Açıklama yok"}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {/* Sadece sahibi için: Düzenle ve Sil */}
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

      {/* Müşteri Ekle/Düzenle Modal */}
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
                    required
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

      {/* Müşteri Bilgileri Modal */}
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
                  router.push(`/dynamiccustomer?id=${selectedCustomerInfo.id}`)
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
              {selectedCustomerInfo.description && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Açıklama:</strong> {selectedCustomerInfo.description}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                <strong>Ekleyen:</strong>{" "}
                {selectedCustomerInfo.ownerName
                  ? selectedCustomerInfo.ownerName
                  : "Bilinmiyor"}
              </p>
              {selectedCustomerInfo.lastCallDate && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Son Arama Tarihi:</strong>{" "}
                  {selectedCustomerInfo.lastCallDate}
                </p>
              )}
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

      {/* E-posta Modal */}
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
    </div>
  );
}
