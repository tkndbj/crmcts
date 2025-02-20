"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Email = {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
};

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Gerçek API'den e-postaları alıyoruz.
  useEffect(() => {
    async function fetchEmails() {
      try {
        const res = await fetch("/api/gmail/inbox");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "E-postalar alınamadı.");
          setEmails([]);
          return;
        }
        // Ensure data is an array before calling .filter
        if (Array.isArray(data)) {
          setEmails(data);
        } else {
          setError("Beklenmeyen veri formatı alındı.");
        }
      } catch (err: any) {
        console.error("E-postalar alınırken hata:", err);
        setError("E-postalar alınırken hata oluştu.");
      }
    }
    fetchEmails();
  }, []);

  // Arama sorgusuna göre filtreleme yapıyoruz.
  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Yeni mesaj gönderimi
  const handleComposeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      if (!res.ok) throw new Error("Mail gönderilemedi");
      setComposeOpen(false);
      setEmailForm({ to: "", subject: "", body: "" });
      // İsteğe bağlı: Inbox'u yenileyin.
    } catch (error: any) {
      console.error("Mail gönderilirken hata:", error);
    }
  };

  // Cevap gönderimi
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
      // İsteğe bağlı: Inbox'u yenileyin.
    } catch (error: any) {
      console.error("Cevap gönderilirken hata:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Yan Menü */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-4"
        >
          Yeni Mesaj
        </button>
        <ul>
          <li className="p-2 rounded hover:bg-gray-200 cursor-pointer font-bold">
            Gelen Kutusu
          </li>
          <li className="p-2 rounded hover:bg-gray-200 cursor-pointer">
            Gönderilmiş
          </li>
        </ul>
      </aside>

      {/* Ana İçerik */}
      <main className="flex-1 p-4">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gelen Kutusu</h1>
          <input
            type="text"
            placeholder="Mail ara"
            className="border border-gray-300 rounded px-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {error && (
          <div className="mb-4 text-red-600">
            {error}
          </div>
        )}
        <div className="bg-white shadow rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Kimden</th>
                <th className="px-4 py-2 text-left">Konu</th>
                <th className="px-4 py-2 text-left">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <td className="px-4 py-2">{email.from}</td>
                    <td className="px-4 py-2">{email.subject}</td>
                    <td className="px-4 py-2">
                      {new Date(email.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-center">
                    Mail bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Mail Detay Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div className="bg-white rounded-lg p-6 w-full max-w-lg relative">
              <button
                onClick={() => setSelectedEmail(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                Kapat
              </button>
              <h2 className="text-xl font-bold mb-2">
                {selectedEmail.subject}
              </h2>
              <p className="text-gray-600 mb-2">
                <strong>Kimden:</strong> {selectedEmail.from}
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Tarih:</strong>{" "}
                {new Date(selectedEmail.date).toLocaleString()}
              </p>
              <div className="mb-4 whitespace-pre-wrap">
                {selectedEmail.body}
              </div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yeni Mesaj Modal */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div className="bg-white rounded-lg p-6 w-full max-w-lg relative">
              <button
                onClick={() => setComposeOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                Kapat
              </button>
              <h2 className="text-xl font-bold mb-4">Yeni Mesaj</h2>
              <form onSubmit={handleComposeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Kime</label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) =>
                      setEmailForm({ ...emailForm, to: e.target.value })
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
                      setEmailForm({ ...emailForm, subject: e.target.value })
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
                      setEmailForm({ ...emailForm, body: e.target.value })
                    }
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  ></textarea>
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

      {/* Cevap Modal */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div className="bg-white rounded-lg p-6 w-full max-w-lg relative">
              <button
                onClick={() => setReplyOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                Kapat
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
                      setEmailForm({ ...emailForm, subject: e.target.value })
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
                      setEmailForm({ ...emailForm, body: e.target.value })
                    }
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  ></textarea>
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
    </div>
  );
}
