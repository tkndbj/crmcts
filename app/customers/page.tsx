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
  getDocs,
  query,
  where,
  arrayUnion,
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
  FiPieChart,
  FiUserPlus,
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

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  lastCallDate: string;
  description: string;
  interested: string;
  channel: string;
  durum: string;
  callStatus: "cevapAlindi" | "cevapsiz";
  missedCall: boolean;
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
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    lastCallDate: "",
    description: "",
    interested: "",
    channel: "",
    durum: "",
    callStatus: "cevapAlindi",
    missedCall: false,
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
  // --- New Reminder state ---
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderCustomer, setReminderCustomer] = useState<any>(null);
  const [reminderDelay, setReminderDelay] = useState("");
  const [reminderUnit, setReminderUnit] = useState("minutes");
  // NEW: New state for reminder "Açıklama"
  const [reminderAciklama, setReminderAciklama] = useState("");
  // NEW: New state for calendar-based date/time when "days" is selected
  const [reminderDateTime, setReminderDateTime] = useState("");
  // NEW: Mode for the reminder modal (new vs edit)
  const [reminderModalMode, setReminderModalMode] = useState<"new" | "edit">(
    "new"
  );

  // NEW: State for call date modal functionality
  const [callDateModalOpen, setCallDateModalOpen] = useState(false);
  const [newCallDateValue, setNewCallDateValue] = useState("");
  const [selectedCallDateCustomer, setSelectedCallDateCustomer] =
    useState<any>(null);

  // NEW: State for owner filter dropdown in the table header
  const [ownerFilter, setOwnerFilter] = useState("Genel");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  // NEW: State for "Müşteri" column durum filter dropdown
  const [showDurumDropdown, setShowDurumDropdown] = useState(false);
  const [durumFilter, setDurumFilter] = useState("");

  // NEW: State for calendar filter
  const [filterDate, setFilterDate] = useState("");
  // NEW: Ref for the hidden calendar input
  const calendarInputRef = useRef<HTMLInputElement>(null);

  // NEW: State for assign user functionality
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assignUserModalOpen, setAssignUserModalOpen] = useState(false);
  const [selectedCustomerForAssign, setSelectedCustomerForAssign] =
    useState<any>(null);

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

  // --- Fetch all users for assignment ---
  useEffect(() => {
    const usersRef = collection(firestore, "users");
    const unsubscribeUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllUsers(usersData);
      },
      (err) => {
        console.error(err);
      }
    );
    return () => unsubscribeUsers();
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

  // Modified to sanitize phone input (allow only digits)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let value = e.target.value;
    if (e.target.name === "phone") {
      value = value.replace(/\D/g, ""); // remove non-digit characters
    }
    setForm({ ...form, [e.target.name]: value });
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
    if (form.callStatus === "cevapAlindi") {
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
        // Duplicate phone check for new customer
        const customersRef = collection(firestore, "customers");
        const q = query(customersRef, where("phone", "==", form.phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError("Bu telefon numarası zaten mevcut.");
          setLoading(false);
          return;
        }
        if (form.callStatus === "cevapsiz") {
          // In "cevapsiz" mode, only phone and lastCallDate are used, and missedCall is true.
          await addDoc(collection(firestore, "customers"), {
            phone: form.phone,
            lastCallDate: form.lastCallDate,
            missedCall: true,
            description: form.description,
            owner: user.uid,
            ownerName: user.displayName || user.email || "Bilinmiyor",
            createdAt: new Date().toISOString(),
          });
        } else {
          // In "cevapAlindi" mode, include all fields.
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
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.address,
            lastCallDate: form.lastCallDate,
            description: form.description,            
            missedCall: true, // keep missedCall as true
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
        callStatus: "cevapAlindi",
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
      callStatus: customer.missedCall ? "cevapsiz" : "cevapAlindi",
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
        const reminderDate = new Date(
          customer.reminderTimestamp.seconds * 1000
        );
        // Adjust to local time by subtracting the timezone offset
        const offset = reminderDate.getTimezoneOffset() * 60000;
        const localDate = new Date(reminderDate.getTime() - offset);
        // Format for datetime-local input: "YYYY-MM-DDTHH:MM"
        const dtLocal = localDate.toISOString().slice(0, 16);
        setReminderUnit("days"); // (optional: adjust this if you want to preserve the original unit)
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
      if (delayMs <= 0) return;
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
  // - "genel": now includes all customers (both with missedCall true and false).
  // - "cevapsizlar": only customers with missedCall === true.
  const filteredCustomers =
    activeTab === "genel"
      ? customers
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
          (customer.name || "").toLowerCase().includes(activeSearchQuery) ||
          (customer.email || "").toLowerCase().includes(activeSearchQuery) ||
          (customer.address || "").toLowerCase().includes(activeSearchQuery) ||
          (customer.phone || "").toLowerCase().includes(activeSearchQuery)
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
        sortedCustomers.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
        break;
      case "nameDesc":
        sortedCustomers.sort((a, b) =>
          (b.name || "").localeCompare(a.name || "")
        );
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

  // Apply durum filter if set (from Müşteri header dropdown)
  if (durumFilter) {
    sortedCustomers = sortedCustomers.filter(
      (customer) =>
        (customer.durum || "").toLowerCase() === durumFilter.toLowerCase()
    );
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

  // New: Handle assigning a customer to a selected user.
  const handleAssignUser = async (selectedUser: any) => {
    if (!selectedCustomerForAssign) return;
    try {
      await updateDoc(
        doc(firestore, "customers", selectedCustomerForAssign.id),
        {
          ownerName:
            selectedUser.name ||
            selectedUser.displayName ||
            selectedUser.email ||
            "Bilinmiyor",
          owner: selectedUser.id,
        }
      );
      setAssignUserModalOpen(false);
      setSelectedCustomerForAssign(null);
    } catch (error: any) {
      console.error("Müşteri ataması yapılırken hata:", error);
    }
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
                    ? "border-teal-500 text-teal-500 font-semibold"
                    : "border-transparent text-black dark:text-white"
                } whitespace-nowrap`}
              >
                Genel
              </button>
              <button
                onClick={() => setActiveTab("kendi")}
                className={`px-2 py-1 md:px-4 md:py-2 rounded-t-lg border-b-2 ${
                  activeTab === "kendi"
                    ? "border-teal-500 text-teal-500 font-semibold"
                    : "border-transparent text-black dark:text-white"
                } whitespace-nowrap`}
              >
                Kendi Müşterilerim
              </button>
              <button
                onClick={() => setActiveTab("cevapsizlar")}
                className={`px-2 py-1 md:px-4 md:py-2 rounded-t-lg border-b-2 ${
                  activeTab === "cevapsizlar"
                    ? "border-teal-500 text-teal-500 font-semibold"
                    : "border-transparent text-black dark:text-white"
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
                    className="text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
                  />
                </button>
                <input
                  type="date"
                  ref={calendarInputRef}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
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
                      className="border rounded p-1 bg-white dark:bg-gray-700 dark:text-white"
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
                className="bg-transparent border border-gray-300 rounded-full px-4 py-1 focus:outline-none text-black dark:text-white"
              />
              {/* New Analytics Button */}
              <button
                onClick={() => router.push("/analytics")}
                title="Analytics"
                className="p-2 md:p-3 border border-blue-500 rounded-full bg-transparent dark:text-white hover:bg-blue-500 hover:text-white transition-colors"
              >
                <FiPieChart size={20} />
              </button>
              <button
                onClick={() => {
                  if (currentSort) {
                    setSortOptions({ ...sortOptions, [activeTab]: "" });
                  } else {
                    setSortModalOpen(true);
                  }
                }}
                className="px-2 py-1 md:px-4 md:py-2 border border-blue-500 rounded-full bg-transparent dark:text-white hover:bg-blue-500 hover:text-white transition-colors whitespace-nowrap flex items-center"
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
                className="px-2 py-1 md:px-4 md:py-2 border border-blue-500 rounded-full bg-transparent dark:text-white hover:bg-blue-500 hover:text-white transition-colors whitespace-nowrap"
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
                    callStatus: "cevapAlindi",
                    missedCall: false,
                  });
                  setModalOpen(true);
                }}
                className="px-2 py-1 md:px-4 md:py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors whitespace-nowrap text-white"
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
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer relative text-black dark:text-white"
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
                                  ? "bg-black dark:bg-white text-white dark:text-black"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                              }`}
                            >
                              {owner}
                            </div>
                          ))}
                        </div>
                      )}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black dark:text-white relative cursor-pointer"
                      onClick={() => setShowDurumDropdown(!showDurumDropdown)}
                    >
                      Müşteri
                      {showDurumDropdown && (
                        <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-gray-700 border border-gray-300 rounded shadow-lg z-10">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDurumFilter("Olumlu");
                              setShowDurumDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                          >
                            Olumlu
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDurumFilter("Olumsuz");
                              setShowDurumDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                          >
                            Olumsuz
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDurumFilter("Orta");
                              setShowDurumDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                          >
                            Orta
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDurumFilter("");
                              setShowDurumDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                          >
                            Tüm
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black dark:text-white w-12">
                      Eposta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black dark:text-white">
                      Telefon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black dark:text-white">
                      Adres
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black dark:text-white">
                      İlgilendiği daire
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-black dark:text-white">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedCustomers.length > 0 ? (
                    sortedCustomers.map((customer) => {
                      const isYellowRow =
                        (activeTab === "genel" || activeTab === "kendi") &&
                        customer.missedCall;
                      const cellTextClass = isYellowRow
                        ? "text-black"
                        : "text-black dark:text-white";
                      return (
                        <tr
                          key={customer.id}
                          className={`whitespace-nowrap ${
                            (activeTab === "genel" || activeTab === "kendi") &&
                            customer.missedCall
                              ? "bg-yellow-100"
                              : ""
                          }`}
                        >
                          <td className={`px-4 py-2 text-sm ${cellTextClass}`}>
                            {customer.ownerName}
                          </td>
                          <td className={`px-4 py-2 text-sm ${cellTextClass}`}>
                            <span
                              onClick={() => handleCustomerInfo(customer)}
                              className="cursor-pointer hover:text-black dark:hover:text-white flex items-center"
                            >
                              {/* Only show status circle for customers with missedCall === false */}
                              {!customer.missedCall && customer.durum && (
                                <span
                                  className="inline-block w-3 h-3 rounded-full mr-1"
                                  style={{
                                    backgroundColor:
                                      customer.durum.toLowerCase() === "olumlu"
                                        ? "green"
                                        : customer.durum.toLowerCase() ===
                                          "orta"
                                        ? "orange"
                                        : customer.durum.toLowerCase() ===
                                          "olumsuz"
                                        ? "red"
                                        : "transparent",
                                  }}
                                ></span>
                              )}
                              {customer.name}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-2 text-sm ${cellTextClass} flex items-center justify-center w-12`}
                          >
                            <button
                              title={customer.email || ""}
                              className="cursor-default hover:text-black dark:hover:text-black transition-colors"
                            >
                              <FiMail size={20} />
                            </button>
                          </td>
                          <td className={`px-4 py-2 text-sm ${cellTextClass}`}>
                            {customer.phone}
                          </td>
                          <td className={`px-4 py-2 text-sm ${cellTextClass}`}>
                            {customer.address}
                          </td>
                          <td className={`px-4 py-2 text-sm ${cellTextClass}`}>
                            {customer.interested}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm ${cellTextClass} text-center`}
                          >
                            <div className="flex items-center justify-center space-x-2">
                              {isOwner(customer) && (
                                <>
                                  <button
                                    onClick={() => handleEditCustomer(customer)}
                                    title="Müşteriyi Düzenle"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    <FiEdit size={20} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteCustomer(customer)
                                    }
                                    title="Müşteriyi Sil"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    <FiTrash2 size={20} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (
                                        customer.reminderTimestamp &&
                                        new Date(
                                          customer.reminderTimestamp.seconds *
                                            1000
                                        ) > new Date()
                                      ) {
                                        openReminderModal(customer, "edit");
                                      } else {
                                        openReminderModal(customer, "new");
                                      }
                                    }}
                                    title="Hatırlatma Ayarla"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    <FiBell
                                      size={20}
                                      className={
                                        customer.reminderTimestamp &&
                                        new Date(
                                          customer.reminderTimestamp.seconds *
                                            1000
                                        ) > new Date()
                                          ? "text-yellow-500"
                                          : "text-black dark:text-white"
                                      }
                                    />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomerForAssign(customer);
                                      setAssignUserModalOpen(true);
                                    }}
                                    title="Müşteriyi Delege Et"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    <FiUserPlus size={20} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCallDateCustomer(customer);
                                      setCallDateModalOpen(true);
                                    }}
                                    title="Yeni Arama Tarihi Ekle"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    <FiPhone size={20} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-4 text-center text-black dark:text-white"
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
                <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
                  {reminderModalMode === "new"
                    ? `${reminderCustomer?.name} için Hatırlatma Ayarla`
                    : `${reminderCustomer?.name} için Ayarlanmış Hatırlatmayı Düzenle`}
                </h2>
                <div className="space-y-4">
                  {reminderUnit === "days" ? (
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white">
                        Tarih ve Saat
                      </label>
                      <input
                        type="datetime-local"
                        value={reminderDateTime}
                        onChange={(e) => setReminderDateTime(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-black dark:text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white">
                        Süre
                      </label>
                      <input
                        type="number"
                        value={reminderDelay}
                        onChange={(e) => setReminderDelay(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-black dark:text-white"
                        placeholder="Süre girin"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white">
                      Birim
                    </label>
                    <select
                      value={reminderUnit}
                      onChange={(e) => setReminderUnit(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-black dark:text-white"
                    >
                      <option value="minutes">Dakika</option>
                      <option value="hours">Saat</option>
                      <option value="days">Gün</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white">
                      Açıklama
                    </label>
                    <input
                      type="text"
                      value={reminderAciklama}
                      onChange={(e) => setReminderAciklama(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-black dark:text-white"
                      placeholder="Açıklama girin"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setReminderModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-black dark:text-white"
                    >
                      İptal
                    </button>
                    {reminderModalMode === "edit" && (
                      <>
                        <button
                          type="button"
                          onClick={handleSetReminder}
                          className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors text-black dark:text-white"
                        >
                          Güncelle
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteReminder}
                          className="px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition-colors text-black dark:text-white"
                        >
                          Sil
                        </button>
                      </>
                    )}
                    {reminderModalMode === "new" && (
                      <button
                        type="button"
                        onClick={handleSetReminder}
                        className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors text-black dark:text-white"
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

        {callDateModalOpen && (
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
                onClick={() => setCallDateModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
                  Yeni Arama Tarihi Ekle
                </h2>
                <input
                  type="date"
                  value={newCallDateValue}
                  onChange={(e) => setNewCallDateValue(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-4"
                />
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setCallDateModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-black dark:text-white"
                  >
                    İptal
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedCallDateCustomer || !newCallDateValue)
                        return;
                      try {
                        const customerRef = doc(
                          firestore,
                          "customers",
                          selectedCallDateCustomer.id
                        );
                        // Use arrayUnion to add the new call date to the "callDates" array field.
                        await updateDoc(customerRef, {
                          callDates: arrayUnion(newCallDateValue),
                        });
                        setCallDateModalOpen(false);
                        setNewCallDateValue("");
                        setSelectedCallDateCustomer(null);
                      } catch (error) {
                        console.error("Arama tarihi eklenirken hata:", error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors text-black dark:text-white"
                  >
                    Ekle
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Assign User Modal */}
        {assignUserModalOpen && (
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
                onClick={() => setAssignUserModalOpen(false)}
              ></motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md"
              >
                <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
                  Kullanıcı Seçin
                </h2>
                <div className="space-y-4">
                  {allUsers.length > 0 ? (
                    allUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleAssignUser(user)}
                        className="cursor-pointer px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-white"
                      >
                        {user.name || user.displayName || user.email}
                      </div>
                    ))
                  ) : (
                    <p className="text-black dark:text-white">
                      Kullanıcı bulunamadı.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setAssignUserModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-black dark:text-white"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
