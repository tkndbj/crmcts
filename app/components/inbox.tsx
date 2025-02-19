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
  // Controls the overall inbox modal visibility.
  const [isOpen, setIsOpen] = useState(false);
  // The selected chat user (object from Firestore).
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  // Show a list of users when no chat is active.
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // Current authenticated user.
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch the list of users from Firestore.
  const fetchUsers = () => {
    setLoadingUsers(true);
    const usersRef = collection(firestore, "users");
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id, // Firestore document ID
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
    return unsubscribe;
  };

  // When the modal opens (and no chat is selected), load users if not already loaded.
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

    // 1. Create or retrieve a chat doc with participants = [currentUser.uid, user.uid].
    useEffect(() => {
      if (!currentUser?.uid || !user) return;
      // Use user.uid if available; otherwise fallback to user.id.
      const otherUid = user.uid || user.id;
      const sortedPair = [currentUser.uid, otherUid].sort();
      const generatedChatId = sortedPair.join("_");
      const chatRef = doc(firestore, "chats", generatedChatId);

      // Check if the chat document exists and create it if it doesn't.
      getDoc(chatRef).then(async (snapshot) => {
        if (!snapshot.exists()) {
          await setDoc(chatRef, {
            participants: sortedPair,
            createdAt: serverTimestamp(),
          });
        }
        // Only set the chatId after ensuring the chat document exists.
        setChatId(generatedChatId);
      });
    }, [currentUser, user]);

    // 2. Subscribe to messages in the chat.
    useEffect(() => {
      if (!chatId) return;
      const messagesRef = collection(firestore, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
      });
      return () => unsubscribe();
    }, [chatId]);

    // 3. Send a new message.
    const sendMessage = async () => {
      if (!newMessage.trim() || !chatId || !currentUser) return;
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

    // Handle form submission.
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage();
    };

    // Helper to format timestamps.
    const formatTimestamp = (timestamp: any) => {
      if (!timestamp) return "";
      const date = timestamp.toDate ? timestamp.toDate() : timestamp;
      return date.toLocaleString();
    };

    return (
      <div className="flex flex-col h-full">
        {/* ChatWindow Header with Back Arrow */}
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
          {/* Placeholder for symmetry */}
          <div className="w-6" />
        </div>

        {/* Messages list */}
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

        {/* Message input wrapped in a form */}
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
  // Main Inbox Return
  // ---------------------------
  return (
    <>
      {/* Floating Inbox Button */}
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

      {/* Inbox Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Outer Container with a wider width */}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[500px] flex flex-col">
              {/* Global Modal Header (only shown when no chat is selected) */}
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

              {/* Content area */}
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
                      users.map((user) => (
                        <div
                          key={user.id}
                          className="cursor-pointer p-2 hover:bg-gray-100 rounded"
                          onClick={() => {
                            // Ensure that the user document includes a `uid` field.
                            setSelectedChatUser(user);
                          }}
                        >
                          <p className="text-gray-700 text-sm font-semibold">
                            {user.displayName || user.email}
                          </p>
                        </div>
                      ))
                    )}
                    {users.length === 0 && !loadingUsers && (
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
