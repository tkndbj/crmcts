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
import {
  FiEdit,
  FiTrash2,
  FiUser,
  FiMail,
  FiFileText,
  FiPhone,
  FiX,
} from "react-icons/fi";

// ***** Replace jsPDF with pdfmake *****
/* Removed:
import { jsPDF } from "jspdf";
import "jspdf-autotable";
*/
// Import pdfmake and its vfs_fonts (using TS ignore if typings are missing)
// @ts-ignore
import pdfMake from "pdfmake/build/pdfmake.js";
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts.js";

pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts?.vfs;
// ****************************************

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

/** Helper: Parse a DD/MM/YYYY string into a Date object */
function parseDateStr(dateStr: string) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return new Date(0);
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

/** Helper: Check if the current user is the owner of a customer */
function isOwner(customer: any) {
  const user = auth.currentUser;
  return user && customer.owner === user.uid;
}

export default function CustomersPage() {
  const router = useRouter();
  return (
    <>
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
  // Active tab state: "genel", "kendi", or "cevapsizlar"
  const [activeTab, setActiveTab] = useState<"genel" | "kendi" | "cevapsizlar">(
    "genel"
  );
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

  // New state for updating a missed call's date
  const [updateCallModalOpen, setUpdateCallModalOpen] = useState(false);
  const [selectedCallCustomer, setSelectedCallCustomer] = useState<any>(null);
  const [newCallDate, setNewCallDate] = useState("");

  // New state for sorting modal and sort options per tab
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState({
    genel: "",
    kendi: "",
    cevapsizlar: "",
  });

  // Mapping of sort option codes to friendly names.
  const sortOptionNames: Record<string, string> = {
    createdAsc: "Eklenme tarihine göre (eskiden yeniye)",
    createdDesc: "Eklenme tarihine göre (yeniden eskiye)",
    nameAsc: "Alfabetik",
    nameDesc: "Alfabetik (tersden)",
    lastCallAsc: "Son aranma tarihine göre (eskiden yeniye)",
    lastCallDesc: "Son aranma tarihine göre (yeniden eskiye)",
  };

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

  // Special handler for last call date input in the add/edit modal
  const handleLastCallDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When the user types manually, we override any missed-call state.
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
   * Handle PDF generation using pdfmake (replacing jsPDF)
   */
  const handleGenerateReport = async (option: "user" | "all") => {
    setReportLoading(true);
    try {
      let reportData;
      let title;
      const currentUser = auth.currentUser;
      if (option === "user") {
        reportData = customers.filter(
          (c) => currentUser && c.owner === currentUser.uid
        );
        title = currentUser
          ? `${currentUser.displayName || currentUser.email}'nin Müşteri Raporu`
          : "Müşteri Raporu";
      } else {
        reportData = customers;
        title = "Tüm Müşteri Raporu";
      }
      // Build the pdfmake docDefinition with modifications:
      const docDefinition: any = {
        pageOrientation: "landscape",
        content: [
          { text: title, style: "header" },
          {
            table: {
              widths: ["*", "*", "*", "*", "*"],
              body: [
                ["İsim", "E-posta", "Telefon", "Adres", "Açıklama"],
                ...reportData.map((customer) => [
                  customer.name || "",
                  customer.email || "",
                  customer.phone || "",
                  customer.address || "",
                  customer.description || "",
                ]),
              ],
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 2,
              paddingTop: () => 2,
              paddingBottom: () => 2,
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
            },
            style: "tableCell",
          },
        ],
        styles: {
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
          tableCell: { fontSize: 8 },
        },
      };

      pdfMake.createPdf(docDefinition).open();
    } catch (error) {
      console.error("Rapor oluşturulurken hata:", error);
    } finally {
      setReportLoading(false);
      setReportModalOpen(false);
    }
  };

  // Compute filtered customers based on active tab.
  const filteredCustomers =
    activeTab === "genel"
      ? customers.filter((customer) => customer.lastCallDate !== "00/00/0000")
      : activeTab === "kendi"
      ? customers.filter((customer) => {
          const user = auth.currentUser;
          return user && customer.owner === user.uid;
        })
      : activeTab === "cevapsizlar"
      ? customers.filter((customer) => customer.lastCallDate === "00/00/0000")
      : customers;

  // Apply sorting based on the current tab's selected sort option.
  let sortedCustomers = [...filteredCustomers];
  const currentSort = sortOptions[activeTab];
  if (currentSort) {
    switch (currentSort) {
      case "createdAsc":
        sortedCustomers.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "createdDesc":
        sortedCustomers.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "nameAsc":
        sortedCustomers.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "nameDesc":
        sortedCustomers.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "lastCallAsc":
        sortedCustomers.sort(
          (a, b) =>
            parseDateStr(a.lastCallDate).getTime() -
            parseDateStr(b.lastCallDate).getTime()
        );
        break;
      case "lastCallDesc":
        sortedCustomers.sort(
          (a, b) =>
            parseDateStr(b.lastCallDate).getTime() -
            parseDateStr(a.lastCallDate).getTime()
        );
        break;
      default:
        break;
    }
  }

  // Handler for opening the update call date modal
  const handleOpenUpdateCallModal = (customer: any) => {
    setSelectedCallCustomer(customer);
    setNewCallDate(""); // start with empty input
    setUpdateCallModalOpen(true);
  };

  // Handler for updating the lastCallDate for a missed call customer
  const handleUpdateCallDate = async () => {
    try {
      if (!selectedCallCustomer) return;
      const customerRef = doc(firestore, "customers", selectedCallCustomer.id);
      await updateDoc(customerRef, {
        lastCallDate: formatDDMMYYYY(newCallDate),
      });
      setUpdateCallModalOpen(false);
      setSelectedCallCustomer(null);
      setNewCallDate("");
    } catch (error) {
      console.error("Son Arama Tarihi güncellenirken hata:", error);
    }
  };

  // Handler for selecting a sort option from the modal
  const handleSelectSortOption = (option: string) => {
    setSortOptions({ ...sortOptions, [activeTab]: option });
    setSortModalOpen(false);
  };

  return (
    <>
      {/* Top section with tabs and action buttons – wrapped in a horizontally scrollable container on mobile */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 overflow-x-auto">
            <div className="flex space-x-2 md:space-x-4">
              <button
                onClick={() => setActiveTab("genel")}
                className={`px-2 py-1 md:px-4 md:py-2 rounded-t-lg border-b-2 ${
                  activeTab === "genel"
                    ? "border-blue-500 text-blue-500 font-semibold"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                } whitespace-nowrap`}
              >
                Genel
              </button>
              <button
                onClick={() => setActiveTab("kendi")}
                className={`px-2 py-1 md:px-4 md:py-2 rounded-t-lg border-b-2 ${
                  activeTab === "kendi"
                    ? "border-blue-500 text-blue-500 font-semibold"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                } whitespace-nowrap`}
              >
                Kendi Müşterilerim
              </button>
              <button
                onClick={() => setActiveTab("cevapsizlar")}
                className={`px-2 py-1 md:px-4 md:py-2 rounded-t-lg border-b-2 ${
                  activeTab === "cevapsizlar"
                    ? "border-blue-500 text-blue-500 font-semibold"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                } whitespace-nowrap`}
              >
                Cevapsızlar
              </button>
            </div>
            <div className="flex space-x-2 md:space-x-4">
              {/* Modified Sıralama button */}
              <button
                onClick={() => {
                  if (currentSort) {
                    // Undo sorting option and reset
                    setSortOptions({ ...sortOptions, [activeTab]: "" });
                  } else {
                    setSortModalOpen(true);
                  }
                }}
                className="px-2 py-1 md:px-4 md:py-2 border border-blue-500 text-blue-500 rounded-full bg-transparent hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center"
              >
                {currentSort ? (
                  <>
                    <FiX size={16} className="mr-2" />
                    <span>{sortOptionNames[currentSort]}</span>
                  </>
                ) : (
                  "Sırala"
                )}
              </button>
              <button
                onClick={() => setReportModalOpen(true)}
                className="px-2 py-1 md:px-4 md:py-2 border border-blue-500 text-blue-500 rounded-full bg-transparent hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <FiFileText size={18} className="inline mr-1" />
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
                className="px-2 py-1 md:px-4 md:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                Müşteri Ekle
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mt-4">
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
                  {sortedCustomers.length > 0 ? (
                    sortedCustomers.map((customer) => (
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
                            {/* For missed call customers, show a phone icon for updating the lastCallDate */}
                            {customer.lastCallDate === "00/00/0000" && (
                              <button
                                onClick={() =>
                                  handleOpenUpdateCallModal(customer)
                                }
                                title="Son Arama Tarihi Güncelle"
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <FiPhone size={20} />
                              </button>
                            )}
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
                    <div className="mt-1 flex items-center space-x-2">
                      <input
                        type="text"
                        name="lastCallDate"
                        placeholder="GG/AA/YYYY"
                        value={form.lastCallDate}
                        onChange={handleLastCallDateChange}
                        className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, lastCallDate: "00/00/0000" })
                        }
                        className={`rounded-full px-3 py-1 border transition-colors ${
                          form.lastCallDate === "00/00/0000"
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-transparent border-gray-300 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        Cevapsız
                      </button>
                    </div>
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

        {/* Update LastCallDate Modal for Missed Calls */}
        <AnimatePresence>
          {updateCallModalOpen && selectedCallCustomer && (
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
                onClick={() => setUpdateCallModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-sm"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  Son Arama Tarihini Güncelle
                </h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Yeni Tarih (GG/AA/YYYY)
                  </label>
                  <input
                    type="text"
                    value={newCallDate}
                    onChange={(e) =>
                      setNewCallDate(formatDDMMYYYY(e.target.value))
                    }
                    placeholder="GG/AA/YYYY"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setUpdateCallModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateCallDate}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modified Sort Modal */}
        <AnimatePresence>
          {sortModalOpen && (
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
                onClick={() => setSortModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  Sırala Seçenekleri
                </h2>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleSelectSortOption("createdAsc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Eklenme tarihine göre (eskiden yeniye)
                  </button>
                  <button
                    onClick={() => handleSelectSortOption("createdDesc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Eklenme tarihine göre (yeniden eskiye)
                  </button>
                  <button
                    onClick={() => handleSelectSortOption("nameAsc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Alfabetik
                  </button>
                  <button
                    onClick={() => handleSelectSortOption("nameDesc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Alfabetik (tersden)
                  </button>
                  <button
                    onClick={() => handleSelectSortOption("lastCallAsc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Son aranma tarihine göre (eskiden yeniye)
                  </button>
                  <button
                    onClick={() => handleSelectSortOption("lastCallDesc")}
                    className="px-4 py-2 bg-transparent border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-left"
                  >
                    Son aranma tarihine göre (yeniden eskiye)
                  </button>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setSortModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
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
