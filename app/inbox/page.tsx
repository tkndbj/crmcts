"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCornerUpLeft,
  FiTrash2,
  FiCornerUpRight,
} from "react-icons/fi";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseApp from "../../firebaseClient";

type Email = {
  id: string;
  from: string;
  to?: string;
  subject: string;
  date: string; // e.g., ISO string or anything parseable by new Date()
  body: string; // plain text body for display
};

type User = {
  id: string;
  email: string;
  name: string;
};

/**
 * Simple in-memory cache for emails: 
 *  - 'inbox': Email[] 
 *  - 'sent': Email[] 
 */
const emailCache: { [key: string]: Email[] | null } = {
  inbox: null,
  sent: null,
};

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Compose / reply / forward modals
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Read states: track which emails have been read. Persist in localStorage.
  const [readEmailIds, setReadEmailIds] = useState<string[]>([]);

  // A simple loading flag to avoid flickers on the "sent" tab especially
  const [loading, setLoading] = useState<boolean>(false);

  // Keep a ref to our polling interval so we can clear it on unmount
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1) Load readEmailIds from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("readEmailIds");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReadEmailIds(parsed);
        }
      } catch {
        // fail silently if JSON.parse fails
      }
    }
  }, []);

  // 2) Whenever readEmailIds changes, save to localStorage
  useEffect(() => {
    localStorage.setItem("readEmailIds", JSON.stringify(readEmailIds));
  }, [readEmailIds]);

  // Fetch real users from Firestore for forwarding
  useEffect(() => {
    async function fetchUsers() {
      try {
        const db = getFirestore(firebaseApp);
        const usersCol = collection(db, "users");
        const snapshot = await getDocs(usersCol);
        const userList = snapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().displayName,
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Kullanıcılar alınırken hata:", error);
      }
    }
    fetchUsers();
  }, []);

  /**
   * Reusable function to fetch emails with caching.
   * - Shows cached data immediately if present.
   * - Then fetches fresh data from the server (no flicker if we have cached data).
   */
  async function fetchEmailsWithCache(tab: "inbox" | "sent") {
    setLoading(true);

    // If we have cached data, use it immediately
    if (emailCache[tab]) {
      setEmails(emailCache[tab]!);
      setError(null);
    } else {
      // If no cache yet, we can optionally clear or show a spinner
      setEmails([]);
    }

    try {
      // e.g., show at least the latest 50 emails
      // Ensure your backend supports ?limit=50 or returns 50 by default
      const endpoint =
        tab === "inbox"
          ? "/api/gmail/inbox?limit=50"
          : "/api/gmail/sent?limit=50";

      const res = await fetch(endpoint);
      // If the response might be HTML on error, it can break .json()
      // So let's do a check or a try-catch
      if (!res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // if fails, data stays null
        }
        setError(data?.error || "E-postalar alınamadı.");
        setEmails([]);
        emailCache[tab] = null; // remove stale cache
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        // update cache and state
        emailCache[tab] = data;
        setEmails(data);
        setError(null);
      } else {
        setError("Beklenmeyen veri formatı alındı.");
        emailCache[tab] = null;
        setEmails([]);
      }
    } catch (err: any) {
      console.error("E-postalar alınırken hata:", err);
      setError("E-postalar alınırken hata oluştu.");
      emailCache[tab] = null;
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  // On activeTab change, fetch new data (and display cached if available)
  useEffect(() => {
    fetchEmailsWithCache(activeTab);
    // Clear the selected email each time we switch tabs
    setSelectedEmail(null);
  }, [activeTab]);

  // Polling approach: re-fetch every 30 seconds for "live" updates
  useEffect(() => {
    // clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      fetchEmailsWithCache(activeTab);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTab]);

  // Filter emails based on search query
  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      (email.from && email.from.toLowerCase().includes(query)) ||
      (email.to && email.to.toLowerCase().includes(query))
    );
  });

  // Mark an email as read (persist locally & in localStorage)
  const markAsRead = (emailId: string) => {
    setReadEmailIds((prev) => {
      if (prev.includes(emailId)) return prev;
      return [...prev, emailId];
    });
  };

  // Clicking on a row: open detail + mark as read
  const handleRowClick = (email: Email) => {
    setSelectedEmail(email);
    markAsRead(email.id);
  };

  // Compose new message
  const handleComposeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      if (!res.ok) {
        throw new Error("Mail gönderilemedi");
      }
      setComposeOpen(false);
      setEmailForm({ to: "", subject: "", body: "" });
      // Refresh "sent" if that's our current tab
      if (activeTab === "sent") {
        fetchEmailsWithCache("sent");
      }
    } catch (error: any) {
      console.error("Mail gönderilirken hata:", error);
    }
  };

  // Reply
  const handleReplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      if (!res.ok) throw new Error("Cevap gönderilemedi");
      setReplyOpen(false);
      setSelectedEmail(null);
      setEmailForm({ to: "", subject: "", body: "" });
      // Optionally refresh
      if (activeTab === "sent") {
        fetchEmailsWithCache("sent");
      }
    } catch (error: any) {
      console.error("Cevap gönderilirken hata:", error);
    }
  };

  // Forward
  const handleForwardSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      if (!res.ok) throw new Error("İletme gönderilemedi");
      setForwardOpen(false);
      setSelectedEmail(null);
      setEmailForm({ to: "", subject: "", body: "" });
      // Optionally refresh
      if (activeTab === "sent") {
        fetchEmailsWithCache("sent");
      }
    } catch (error: any) {
      console.error("İletme gönderilirken hata:", error);
    }
  };

  // Delete email (demo) - remove from state/cache. Real app: call DELETE API
  const handleDelete = (id: string) => {
    if (window.confirm("Maili silmek istediğinize emin misiniz?")) {
      setEmails((prev) => prev.filter((email) => email.id !== id));
      if (emailCache[activeTab]) {
        emailCache[activeTab] = emailCache[activeTab]!.filter(
          (email) => email.id !== id
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Side Menu */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-4"
        >
          Yeni Mesaj
        </button>
        <ul>
          <li
            onClick={() => setActiveTab("inbox")}
            className={`p-2 rounded hover:bg-gray-200 cursor-pointer ${
              activeTab === "inbox" ? "font-bold" : ""
            }`}
          >
            Gelen Kutusu
          </li>
          <li
            onClick={() => setActiveTab("sent")}
            className={`p-2 rounded hover:bg-gray-200 cursor-pointer ${
              activeTab === "sent" ? "font-bold" : ""
            }`}
          >
            Gönderilmiş
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {activeTab === "inbox" ? "Gelen Kutusu" : "Gönderilmiş"}
          </h1>
          <input
            type="text"
            placeholder="Mail ara"
            className="border border-gray-300 rounded px-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        {/* If loading, show a spinner or message (optional) */}
        {loading && emails.length === 0 && (
          <div className="mb-4 text-gray-500">Yükleniyor...</div>
        )}

        {/* Table of Emails */}
        <div className="bg-white shadow rounded overflow-x-auto sm:overflow-x-visible">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">
                  {activeTab === "inbox" ? "Kimden" : "Kime"}
                </th>
                <th className="px-4 py-2 text-left">Konu</th>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => {
                  const isRead = readEmailIds.includes(email.id);
                  return (
                    <tr
                      key={email.id}
                      onClick={() => handleRowClick(email)}
                      className={`hover:bg-gray-100 cursor-pointer ${
                        isRead ? "font-normal" : "font-bold"
                      }`}
                    >
                      <td className="px-4 py-2">
                        {activeTab === "inbox" ? email.from : email.to}
                      </td>
                      <td className="px-4 py-2">{email.subject}</td>
                      <td className="px-4 py-2">
                        {new Date(email.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyOpen(true);
                            setEmailForm({
                              to: email.from,
                              subject: "Re: " + email.subject,
                              body: "",
                            });
                          }}
                          title="Cevapla"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FiCornerUpLeft size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setForwardOpen(true);
                            setEmailForm({
                              to: "",
                              subject: "Fwd: " + email.subject,
                              // Include entire original body
                              body: `\n\n--- Orijinal Mesaj ---\n${email.body}`,
                            });
                          }}
                          title="İlet"
                          className="text-green-500 hover:text-green-700"
                        >
                          <FiCornerUpRight size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(email.id);
                          }}
                          title="Sil"
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                // No emails or no matches
                !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-center">
                      Mail bulunamadı.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Email Detail Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-2xl relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                onClick={() => setSelectedEmail(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-2">
                {selectedEmail.subject}
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Kimden:</strong> {selectedEmail.from}
                </p>
                {activeTab === "sent" && selectedEmail.to && (
                  <p className="text-sm text-gray-600">
                    <strong>Kime:</strong> {selectedEmail.to}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <strong>Tarih:</strong>{" "}
                  {new Date(selectedEmail.date).toLocaleString()}
                </p>
              </div>
              <div className="prose max-w-none mb-4">
                {selectedEmail.body.split("\n").map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setReplyOpen(true);
                    setEmailForm({
                      to: selectedEmail.from,
                      subject: "Re: " + selectedEmail.subject,
                      body: "",
                    });
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Cevapla
                </button>
                <button
                  onClick={() => {
                    setForwardOpen(true);
                    setEmailForm({
                      to: "",
                      subject: "Fwd: " + selectedEmail.subject,
                      body: `\n\n--- Orijinal Mesaj ---\n${selectedEmail.body}`,
                    });
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  İlet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose (New Message) Modal */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-lg relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                onClick={() => setComposeOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">Yeni Mesaj</h2>
              <form onSubmit={handleComposeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Kime</label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Konu</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">İçerik</label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Gönder
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-lg relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                onClick={() => setReplyOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">Cevapla</h2>
              <form onSubmit={handleReplySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Kime</label>
                  <input
                    type="email"
                    value={emailForm.to}
                    readOnly
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Konu</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">İçerik</label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Cevap Gönder
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-lg relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                onClick={() => setForwardOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">İlet</h2>
              <form onSubmit={handleForwardSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Kime</label>
                  <select
                    value={emailForm.to}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Bir kullanıcı seçin</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Konu</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">İçerik</label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) =>
                      setEmailForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  İlet Gönder
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
