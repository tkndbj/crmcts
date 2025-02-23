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
import { motion, AnimatePresence } from "framer-motion";
import {
  FiEdit,
  FiTrash2,
  FiMail,
  FiFileText,
  FiPhone,
  FiX,
} from "react-icons/fi";

// ----- pdfmake setup -----
// @ts-ignore
import pdfMake from "pdfmake/build/pdfmake.js";
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts.js";
pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts?.vfs;
// --------------------------

import CustomerFormModal from "./components/CustomerFormModal";
import CustomerInfoModal from "./components/CustomerInfoModal";
import EmailModal from "./components/EmailModal";
import UpdateCallModal from "./components/UpdateCallModal";
import SortModal from "./components/SortModal";
// Removed ReportModal
import PdfGenerator from "./components/PdfGenerator";

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
  return (
    <>
      <CustomersPageContent />
    </>
  );
}

function CustomersPageContent() {
  const router = useRouter();

  // --- State declarations ---
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
  const [updateCallModalOpen, setUpdateCallModalOpen] = useState(false);
  const [selectedCallCustomer, setSelectedCallCustomer] = useState<any>(null);
  const [newCallDate, setNewCallDate] = useState("");
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState({
    genel: "",
    kendi: "",
    cevapsizlar: "",
  });
  // New state to trigger PDF generation modal flow
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  // New state to hold search queries for each tab
  const [searchQueries, setSearchQueries] = useState({
    genel: "",
    kendi: "",
    cevapsizlar: "",
  });
  // Remove reportModalOpen and reportLoading states

  // --- Fetch customers ---
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

  // --- Outside tooltip listener ---
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

  // --- Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLastCallDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      lastCallDate: formatDDMMYYYY(e.target.value),
    });
  };

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

  const handleCustomerInfo = (customer: any) => {
    setSelectedCustomerInfo(customer);
    setCustomerInfoModalOpen(true);
  };

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

  // When the "Rapor Çıkar" button is clicked, open the multi–step PdfGenerator flow directly.
  const handleGenerateReport = () => {
    setPdfModalOpen(true);
  };

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

  // Apply search filtering based on the active tab's search query
  const activeSearchQuery = searchQueries[activeTab].toLowerCase();
  const filteredCustomersWithSearch = activeSearchQuery
    ? filteredCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(activeSearchQuery) ||
          customer.email.toLowerCase().includes(activeSearchQuery) ||
          customer.address.toLowerCase().includes(activeSearchQuery)
      )
    : filteredCustomers;

  let sortedCustomers = [...filteredCustomersWithSearch];
  const currentSort = sortOptions[activeTab];
  const sortOptionNames: Record<string, string> = {
    createdAsc: "Eklenme tarihine göre (eskiden yeniye)",
    createdDesc: "Eklenme tarihine göre (yeniden eskiye)",
    nameAsc: "Alfabetik",
    nameDesc: "Alfabetik (tersden)",
    lastCallAsc: "Son aranma tarihine göre (eskiden yeniye)",
    lastCallDesc: "Son aranma tarihine göre (yeniden eskiye)",
  };

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

  const handleOpenUpdateCallModal = (customer: any) => {
    setSelectedCallCustomer(customer);
    setNewCallDate("");
    setUpdateCallModalOpen(true);
  };

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

  const handleSelectSortOption = (option: string) => {
    setSortOptions({ ...sortOptions, [activeTab]: option });
    setSortModalOpen(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Section with Tabs and Action Buttons */}
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
            <div className="flex space-x-2 md:space-x-4 items-center">
              {/* New Search Box */}
              <input
                type="text"
                value={searchQueries[activeTab]}
                onChange={(e) =>
                  setSearchQueries({
                    ...searchQueries,
                    [activeTab]: e.target.value,
                  })
                }
                placeholder={
                  activeTab === "genel"
                    ? "Genelde ara"
                    : activeTab === "kendi"
                    ? "Kendi müşterilerinde ara"
                    : "Cevapsızlarda ara"
                }
                className="bg-transparent border border-gray-300 rounded-full px-4 py-1 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (currentSort) {
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
                onClick={handleGenerateReport}
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

        {/* --- Modals --- */}
        <CustomerFormModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCustomer(null);
          }}
          onSubmit={handleSaveCustomer}
          form={form}
          setForm={setForm}
          error={error}
          loading={loading}
          selectedCustomer={selectedCustomer}
          handleInputChange={handleInputChange}
          handleLastCallDateChange={handleLastCallDateChange}
        />

        <CustomerInfoModal
          isOpen={customerInfoModalOpen && selectedCustomerInfo !== null}
          onClose={() => setCustomerInfoModalOpen(false)}
          customer={selectedCustomerInfo}
        />

        <EmailModal
          isOpen={emailModalOpen && selectedEmailCustomer !== null}
          onClose={() => setEmailModalOpen(false)}
          selectedEmailCustomer={selectedEmailCustomer}
          emailSubject={emailSubject}
          setEmailSubject={setEmailSubject}
          emailMessage={emailMessage}
          setEmailMessage={setEmailMessage}
          emailSending={emailSending}
          emailError={emailError}
          onSendEmail={handleSendEmail}
          authEmail={auth.currentUser?.email || ""}
        />

        <UpdateCallModal
          isOpen={updateCallModalOpen && selectedCallCustomer !== null}
          onClose={() => setUpdateCallModalOpen(false)}
          newCallDate={newCallDate}
          setNewCallDate={setNewCallDate}
          onUpdateCallDate={handleUpdateCallDate}
        />

        <SortModal
          isOpen={sortModalOpen}
          onClose={() => setSortModalOpen(false)}
          onSelectSortOption={handleSelectSortOption}
        />

        {/* Directly show the PdfGenerator flow modal when pdfModalOpen is true */}
        {pdfModalOpen && (
          <PdfGenerator
            customers={customers}
            currentUser={auth.currentUser}
            onComplete={() => {
              setPdfModalOpen(false);
            }}
            onClose={() => {
              setPdfModalOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}
