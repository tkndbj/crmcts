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

  // Listen for auth state changes.
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed, user:", user);
      setCurrentUser(user);
    });
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
        console.log("Fetched users:", data);
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

      // Get the other user's UID from their document.
      // We use user.uid if available; otherwise, fallback to the document ID.
      const otherUid = user.uid || user.id;
      console.log("Current user UID:", currentUser.uid);
      console.log("Other user UID:", otherUid);

      // Generate a unique chat id by sorting and joining the UIDs.
      const sortedPair = [currentUser.uid, otherUid].sort();
      const generatedChatId = sortedPair.join("_");
      console.log("Generated Chat ID:", generatedChatId);

      async function createOrGetChat() {
        try {
          const chatRef = doc(firestore, "chats", generatedChatId);
          console.log("Attempting to get chat document:", generatedChatId);
          const snap = await getDoc(chatRef);
          if (!snap.exists()) {
            console.log("Chat document does not exist, creating new chat...");
            // Create the chat document with the participants array.
            await setDoc(chatRef, {
              participants: sortedPair,
              createdAt: serverTimestamp(),
            });
          } else {
            const data = snap.data();
            if (!data.participants.includes(currentUser.uid)) {
              console.error(
                "Chat document exists but current user is missing from participants:",
                data
              );
            } else {
              console.log("Chat document already exists:", data);
            }
          }
          // Set the chatId regardless of creation or existence.
          setChatId(generatedChatId);
        } catch (err) {
          console.error("Error creating/fetching chat document:", err);
        }
      }

      createOrGetChat();
    }, [currentUser, user]);

    /**
     * Subscribe to messages ONLY after we have a valid chatId.
     */
    useEffect(() => {
      if (!chatId) return;
      const messagesRef = collection(firestore, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      console.log("Subscribing to messages for chat:", chatId);
      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Received messages:", msgs);
        setMessages(msgs);
      });

      return () => unsub();
    }, [chatId]);

    /** Send a new message */
    const sendMessage = async () => {
      if (!newMessage.trim() || !chatId || !currentUser?.uid) return;
      try {
        const messagesRef = collection(firestore, "chats", chatId, "messages");
        console.log("Sending message:", newMessage.trim());
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
          <div className="w-6" />
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
                            console.log("Selected chat user:", u);
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
