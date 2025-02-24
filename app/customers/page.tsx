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
  Timestamp,
  deleteField,
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
  FiBell,
  FiCalendar,
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
import ReminderModal from "./components/ReminderModal";
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
  const [showCalendar, setShowCalendar] = useState(false);
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
    interested: "",
    channel: "",
    durum: "",
    callStatus: "cevapAlındı", // "cevapAlındı" (default) or "cevapsiz"
    missedCall: false,       // false when "cevapAlındı", true when "cevapsiz"
  });
  const [tooltipCustomerId, setTooltipCustomerId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"genel" | "kendi" | "cevapsizlar">("genel");
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
  // --- New Reminder state ---
  const [liveReminderModalOpen, setLiveReminderModalOpen] = useState(false);
  const [liveReminderMessage, setLiveReminderMessage] = useState("");
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderCustomer, setReminderCustomer] = useState<any>(null);
  const [reminderDelay, setReminderDelay] = useState("");
  const [reminderUnit, setReminderUnit] = useState("minutes");
  // NEW: New state for reminder "Açıklama"
  const [reminderAciklama, setReminderAciklama] = useState("");
  // NEW: New state for calendar-based date/time when "days" is selected
  const [reminderDateTime, setReminderDateTime] = useState("");
  // NEW: Mode for the reminder modal (new vs edit)
  const [reminderModalMode, setReminderModalMode] = useState<"new" | "edit">("new");

  // NEW: State for owner filter dropdown in the table header
  const [ownerFilter, setOwnerFilter] = useState("Genel");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  // NEW: State for calendar filter
  const [filterDate, setFilterDate] = useState("");
  // Removed showCalendar state since it's no longer needed

  // NEW: Ref for the hidden calendar input
  const calendarInputRef = useRef<HTMLInputElement>(null);

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

    // In "Cevap Alındı" mode, channel and durum are compulsory.
    if (form.callStatus === "cevapAlındı") {
      if (!form.channel.trim() || !form.durum.trim()) {
        setError("Kanal ve Durum alanları zorunludur.");
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Bu işlemi yapmak için giriş yapmış olmanız gerekir.");
        setLoading(false);
        return;
      }
      if (!selectedCustomer) {
        if (form.callStatus === "cevapsiz") {
          // In "cevapsiz" mode, only phone and lastCallDate are used, and missedCall is true.
          await addDoc(collection(firestore, "customers"), {
            phone: form.phone,
            lastCallDate: form.lastCallDate,
            missedCall: true,
            owner: user.uid,
            ownerName: user.displayName || user.email || "Bilinmiyor",
            createdAt: new Date().toISOString(),
          });
        } else {
          // In "cevapAlındı" mode, include all fields.
          await addDoc(collection(firestore, "customers"), {
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
            owner: user.uid,
            ownerName: user.displayName || user.email || "Bilinmiyor",
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        const customerRef = doc(firestore, "customers", selectedCustomer.id);
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
      }
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        lastCallDate: "",
        description: "",
        interested: "",
        channel: "",
        durum: "",
        callStatus: "cevapAlındı",
        missedCall: false,
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
      interested: customer.interested || "",
      channel: customer.channel || "",
      durum: customer.durum || "",
      callStatus: customer.missedCall ? "cevapsiz" : "cevapAlındı",
      missedCall: customer.missedCall || false,
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

  const handleGenerateReport = () => {
    setPdfModalOpen(true);
  };

  // New: Open reminder modal for a specific customer in either "new" or "edit" mode.
  const openReminderModal = (customer: any, mode: "new" | "edit" = "new") => {
    setReminderCustomer(customer);
    setReminderModalMode(mode);
    if (mode === "new") {
      setReminderDelay("");
      setReminderUnit("minutes");
      setReminderAciklama("");
      setReminderDateTime("");
    } else if (mode === "edit") {
      if (customer.reminderTimestamp) {
        const reminderDate = new Date(customer.reminderTimestamp.seconds * 1000);
        // Format for datetime-local input: "YYYY-MM-DDTHH:MM"
        const dtLocal = reminderDate.toISOString().substring(0, 16);
        setReminderUnit("days");
        setReminderDateTime(dtLocal);
      }
      setReminderAciklama(customer.reminderDescription || "");
      setReminderDelay("");
    }
    setReminderModalOpen(true);
  };

  // New: Handle setting/updating a reminder (works for both new and edit modes)
  const handleSetReminder = async () => {
    if (!reminderCustomer) return;
    let targetTime: Date;
    if (reminderUnit === "days") {
      if (!reminderDateTime) return;
      targetTime = new Date(reminderDateTime);
      const delayMs = targetTime.getTime() - Date.now();
      if (delayMs <= 0) return; // Optionally, alert the user here.
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
    await updateDoc(doc(firestore, "customers", reminderCustomer.id), {
      reminderTimestamp: Timestamp.fromDate(targetTime),
      reminderDescription: reminderAciklama,
    });
    const delayMs = targetTime.getTime() - Date.now();
    setTimeout(async () => {
      await addDoc(collection(firestore, "notifications"), {
        user: auth.currentUser?.uid,
        customerId: reminderCustomer.id,
        message: `Hatırlatma: ${reminderCustomer.name}${
          reminderAciklama ? " - Açıklama: " + reminderAciklama : ""
        }`,
        createdAt: new Date().toISOString(),
        unread: true,
      });
      setLiveReminderMessage(
        `Hatırlatma: ${reminderCustomer.name}${
          reminderAciklama ? " - Açıklama: " + reminderAciklama : ""
        }`
      );
      setLiveReminderModalOpen(true);
    }, delayMs);
    setReminderModalOpen(false);
    setReminderAciklama("");
    setReminderDelay("");
    setReminderDateTime("");
  };

  // New: Handle deletion of an existing reminder
  const handleDeleteReminder = async () => {
    if (!reminderCustomer) return;
    try {
      await updateDoc(doc(firestore, "customers", reminderCustomer.id), {
        reminderTimestamp: deleteField(),
        reminderDescription: deleteField(),
      });
      setReminderModalOpen(false);
    } catch (error) {
      console.error("Hatırlatma silinirken hata:", error);
    }
  };

  // Modified filtering:
  // - "genel": only customers with missedCall === false.
  // - "cevapsizlar": only customers with missedCall === true.
  const filteredCustomers =
    activeTab === "genel"
      ? customers.filter((customer) => customer.missedCall === false)
      : activeTab === "kendi"
      ? customers.filter((customer) => {
          const user = auth.currentUser;
          return user && customer.owner === user.uid;
        })
      : activeTab === "cevapsizlar"
      ? customers.filter((customer) => customer.missedCall === true)
      : customers;

  const activeSearchQuery = searchQueries[activeTab].toLowerCase();
  const filteredCustomersWithSearch = activeSearchQuery
    ? filteredCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(activeSearchQuery) ||
          customer.email.toLowerCase().includes(activeSearchQuery) ||
          customer.address.toLowerCase().includes(activeSearchQuery) ||
          customer.phone.toLowerCase().includes(activeSearchQuery)
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
            parseDateStr(a.lastCallDate).getTime() - parseDateStr(b.lastCallDate).getTime()
        );
        break;
      case "lastCallDesc":
        sortedCustomers.sort(
          (a, b) =>
            parseDateStr(b.lastCallDate).getTime() - parseDateStr(a.lastCallDate).getTime()
        );
        break;
      default:
        break;
    }
  }

  // Apply owner filter if not set to "Genel"
  if (ownerFilter !== "Genel") {
    sortedCustomers = sortedCustomers.filter(
      (customer) => customer.ownerName === ownerFilter
    );
  }

  // Apply createdAt date filter if set
  if (filterDate) {
    sortedCustomers = sortedCustomers.filter((customer) => {
      const createdDate = new Date(customer.createdAt)
        .toISOString()
        .substring(0, 10);
      return createdDate === filterDate;
    });
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

  // Compute unique owner names for dropdown (including "Genel")
  const uniqueOwners = Array.from(new Set(customers.map((c) => c.ownerName)));
  const ownersList = ["Genel", ...uniqueOwners.filter((o) => o !== "Genel")];

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
              {/* New: Calendar icon & date filter */}
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    if (calendarInputRef.current) {
                      if (calendarInputRef.current.showPicker) {
                        calendarInputRef.current.showPicker();
                      } else {
                        calendarInputRef.current.click();
                      }
                    }
                  }}
                  title="Tarihe Göre Filtrele"
                  className="p-2"
                >
                  <FiCalendar
                    size={20}
                    className="text-gray-500 hover:text-blue-500 transition-colors"
                  />
                </button>
                <input
                  type="date"
                  ref={calendarInputRef}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => {
                        setFilterDate(e.target.value);
                        setShowCalendar(false);
                      }}
                      className="border rounded p-1 bg-white dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                )}
                {filterDate && (
                  <button
                    onClick={() => setFilterDate("")}
                    className="ml-2 text-red-500"
                    title="Filtreyi Temizle"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>

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
                  // Reset form to defaults when adding a new customer.
                  setSelectedCustomer(null);
                  setForm({
                    name: "",
                    email: "",
                    phone: "",
                    address: "",
                    lastCallDate: "",
                    description: "",
                    interested: "",
                    channel: "",
                    durum: "",
                    callStatus: "cevapAlındı",
                    missedCall: false,
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
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer relative"
                      onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                    >
                      Ekleyen
                      {showOwnerDropdown && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-300 rounded shadow-lg z-10">
                          {ownersList.map((owner) => (
                            <div
                              key={owner}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOwnerFilter(owner);
                                setShowOwnerDropdown(false);
                              }}
                              className={`px-4 py-2 cursor-pointer ${
                                owner === ownerFilter
                                  ? "bg-[#00A86B] text-white"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-600"
                              }`}
                            >
                              {owner}
                            </div>
                          ))}
                        </div>
                      )}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Müşteri
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      İlgilendiği daire
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedCustomers.length > 0 ? (
                    sortedCustomers.map((customer) => (
                      // For "Kendi Müşterilerim" tab, highlight the row if missedCall is true
                      <tr key={customer.id} className={`whitespace-nowrap ${activeTab === "kendi" && customer.missedCall ? "bg-yellow-100" : ""}`}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {customer.ownerName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          <span
                            onClick={() => handleCustomerInfo(customer)}
                            className="cursor-pointer hover:text-blue-500 flex items-center"
                          >
                            {/* Only show status circle for customers with missedCall === false */}
                            {!customer.missedCall && customer.durum && (
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-1"
                                style={{
                                  backgroundColor:
                                    customer.durum.toLowerCase() === "olumlu"
                                      ? "green"
                                      : customer.durum.toLowerCase() === "orta"
                                      ? "yellow"
                                      : customer.durum.toLowerCase() === "olumsuz"
                                      ? "red"
                                      : "transparent",
                                }}
                              ></span>
                            )}
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
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {customer.interested}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      customer.reminderTimestamp &&
                                      new Date(
                                        customer.reminderTimestamp.seconds * 1000
                                      ) > new Date()
                                    ) {
                                      openReminderModal(customer, "edit");
                                    } else {
                                      openReminderModal(customer, "new");
                                    }
                                  }}
                                  title="Hatırlatma Ayarla"
                                  className="hover:text-yellow-500 transition-colors"
                                >
                                  <FiBell
                                    size={20}
                                    className={
                                      customer.reminderTimestamp &&
                                      new Date(
                                        customer.reminderTimestamp.seconds * 1000
                                      ) > new Date()
                                        ? "text-yellow-500"
                                        : "text-gray-500"
                                    }
                                  />
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
                        colSpan={7}
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

        {/* Reminder Modal for setting/updating a reminder */}
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  {reminderModalMode === "new"
                    ? `${reminderCustomer?.name} için Hatırlatma Ayarla`
                    : `${reminderCustomer?.name} için Ayarlanmış Hatırlatmayı Düzenle`}
                </h2>
                <div className="space-y-4">
                  {reminderUnit === "days" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Tarih ve Saat
                      </label>
                      <input
                        type="datetime-local"
                        value={reminderDateTime}
                        onChange={(e) => setReminderDateTime(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Süre
                      </label>
                      <input
                        type="number"
                        value={reminderDelay}
                        onChange={(e) => setReminderDelay(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                        placeholder="Süre girin"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Birim
                    </label>
                    <select
                      value={reminderUnit}
                      onChange={(e) => setReminderUnit(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="minutes">Dakika</option>
                      <option value="hours">Saat</option>
                      <option value="days">Gün</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Açıklama
                    </label>
                    <input
                      type="text"
                      value={reminderAciklama}
                      onChange={(e) => setReminderAciklama(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Açıklama girin"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setReminderModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-gray-900 dark:text-gray-100"
                    >
                      İptal
                    </button>
                    {reminderModalMode === "edit" && (
                      <>
                        <button
                          type="button"
                          onClick={handleSetReminder}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Güncelle
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteReminder}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Sil
                        </button>
                      </>
                    )}
                    {reminderModalMode === "new" && (
                      <button
                        type="button"
                        onClick={handleSetReminder}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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

        {/* Live Reminder Modal */}
        {liveReminderModalOpen && (
          <ReminderModal
            isOpen={liveReminderModalOpen}
            onClose={() => setLiveReminderModalOpen(false)}
            message={liveReminderMessage}
          />
        )}
      </div>
    </>
  );
}
