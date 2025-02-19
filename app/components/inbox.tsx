"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMessageSquare, FiX, FiArrowLeft } from "react-icons/fi";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export default function Inbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  /** Fetch all users (once) when the inbox is opened */
  const fetchUsers = () => {
    setLoadingUsers(true);
    const usersRef = collection(firestore, "users");
    const unsub = onSnapshot(
      usersRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(data);
        setLoadingUsers(false);
      },
      (err) => {
        console.error("Error fetching users:", err);
        setLoadingUsers(false);
      }
    );
    return unsub;
  };

  useEffect(() => {
    if (isOpen && !selectedChatUser && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen, selectedChatUser, users.length]);

  // ---------------------------
  // ChatWindow Component
  // ---------------------------
  const ChatWindow = ({ user }: { user: any }) => {
    const [chatId, setChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
      if (!currentUser?.uid || !user) return;

      // This is the other user's actual Auth UID if it exists, or else fallback to doc.id
      // Make sure that doc.id IS the Auth UID if there's no user.uid
      const otherUid = user.uid || user.id;
      const sortedPair = [currentUser.uid, otherUid].sort();
      const generatedChatId = sortedPair.join("_");

      async function createOrGetChat() {
        try {
          const chatRef = doc(firestore, "chats", generatedChatId);
          const snap = await getDoc(chatRef);
          if (!snap.exists()) {
            await setDoc(chatRef, {
              participants: sortedPair,
              createdAt: serverTimestamp(),
            });
          }
          // Only after the doc definitely exists, set the chatId
          setChatId(generatedChatId);
        } catch (err) {
          console.error("Error creating/fetching chat doc:", err);
        }
      }

      createOrGetChat();
    }, [currentUser, user]);

    /**
     * Subscribe to messages ONLY after we have a valid chatId
     * and the parent doc definitely exists.
     */
    useEffect(() => {
      if (!chatId) return;
      const messagesRef = collection(firestore, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
      });

      return () => unsub();
    }, [chatId]);

    /** Send a new message */
    const sendMessage = async () => {
      if (!newMessage.trim() || !chatId || !currentUser?.uid) return;

      try {
        const messagesRef = collection(firestore, "chats", chatId, "messages");
        await addDoc(messagesRef, {
          text: newMessage.trim(),
          sender: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage();
    };

    const formatTimestamp = (ts: any) => {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : ts;
      return d.toLocaleString();
    };

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2 mb-2">
          <button
            onClick={() => setSelectedChatUser(null)}
            title="Back"
            className="text-gray-600 hover:text-gray-800"
          >
            <FiArrowLeft size={20} />
          </button>
          <h3 className="text-lg font-bold flex-1 text-center">
            Chat with {user.displayName || user.email}
          </h3>
          <div className="w-6" /> {/* placeholder for symmetry */}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-2">
          {messages.map((msg) => {
            const isMine = msg.sender === currentUser?.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${
                  isMine ? "justify-end" : "justify-start"
                } px-1`}
              >
                <div
                  className={`rounded px-3 py-2 mb-1 max-w-xs break-words ${
                    isMine
                      ? "bg-blue-500 text-white self-end"
                      : "bg-gray-200 text-gray-800 self-start"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatTimestamp(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex border-t pt-2">
          <input
            className="flex-1 border rounded-l px-2 py-1 text-sm focus:outline-none"
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-1 rounded-r hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------
  // Main Return
  // ---------------------------
  return (
    <>
      {/* Inbox Button */}
      <button
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
        onClick={() => {
          setIsOpen(!isOpen);
          setSelectedChatUser(null);
        }}
        title="Open Inbox"
      >
        <FiMessageSquare size={24} />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[500px] flex flex-col">
              {!selectedChatUser && (
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <h3 className="text-lg font-semibold">Kullanıcılar</h3>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedChatUser(null);
                    }}
                    title="Close Inbox"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto">
                {selectedChatUser ? (
                  <ChatWindow user={selectedChatUser} />
                ) : (
                  <>
                    {loadingUsers ? (
                      <p className="text-gray-600 text-sm">
                        Kullanıcılar yükleniyor...
                      </p>
                    ) : (
                      users.map((u) => (
                        <div
                          key={u.id}
                          className="cursor-pointer p-2 hover:bg-gray-100 rounded"
                          onClick={() => {
                            setSelectedChatUser(u);
                          }}
                        >
                          <p className="text-gray-700 text-sm font-semibold">
                            {u.displayName || u.email}
                          </p>
                        </div>
                      ))
                    )}

                    {!loadingUsers && users.length === 0 && (
                      <p className="text-gray-600 text-sm">
                        Kullanıcı bulunamadı.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
