"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { FiBell } from "react-icons/fi";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";

const NotificationsBell = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the notification window when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Subscribe to notifications regardless of the window state.
  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        // If no user is logged in, clear notifications
        setNotifications([]);
        return;
      }

      const db = getFirestore(firebaseApp);
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("user", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setNotifications(data);
        },
        (error) => {
          console.error("Error fetching notifications:", error);
        }
      );

      // Clean up the Firestore listener when the auth state changes
      return () => {
        unsubscribeSnapshot();
      };
    });

    // Clean up the auth state listener
    return () => {
      unsubscribeAuth();
    };
  }, []);

  // When the notification window is opened, mark all unread notifications as read.
  useEffect(() => {
    if (open) {
      const db = getFirestore(firebaseApp);
      notifications.forEach((notif) => {
        if (notif.unread) {
          const notifRef = doc(db, "notifications", notif.id);
          updateDoc(notifRef, { unread: false });
        }
      });
    }
  }, [open, notifications]);

  // Only count notifications that are still unread
  const unreadCount = notifications.filter((notif) => notif.unread).length;
  const badgeCount = open ? 0 : unreadCount;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // Instead of returning early, conditionally render the UI.
  return (
    <>
      {pathname !== "/" && (
        <div ref={containerRef} className="fixed bottom-24 right-6 z-50">
          <button
            onClick={() => setOpen(!open)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg relative"
          >
            <FiBell size={33} />
            {badgeCount > 0 && (
              <div className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {badgeCount}
              </div>
            )}
          </button>

          {open && (
            <div className="absolute bottom-full mb-2 right-0 bg-white p-4 rounded-md shadow-lg w-80">
              <h2 className="font-bold mb-2">Bildirimler</h2>
              {notifications.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto">
                  {notifications.map((notif) => (
                    <li key={notif.id} className="mb-2 border-b pb-1">
                      <p className="text-sm">{notif.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(notif.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">Bildirim yok</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default NotificationsBell;
