"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../globals.css";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
// New icon imports from react-icons/hi
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineCalendar,
  HiOutlineUserCircle,
  HiOutlineShieldExclamation,
} from "react-icons/hi";

const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export default function NavigationPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-10 text-gray-800 dark:text-gray-100">
          Navigasyon
        </h1>
        {/* For mobile: grid-cols-2 with minimal gap, and on larger screens larger gaps */}
        <div className="grid grid-cols-2 gap-2 md:gap-8">
          <Link href="/customers">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 sm:p-4 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <HiOutlineUserGroup className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-500 mr-2 sm:mr-4" />
              <span className="text-lg font-medium sm:text-xl text-gray-800 dark:text-gray-100">
                Müşteriler
              </span>
            </div>
          </Link>
          <Link href="/units">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 sm:p-4 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <HiOutlineOfficeBuilding className="h-10 w-10 sm:h-12 sm:w-12 text-teal-500 mr-2 sm:mr-4" />
              <span className="text-lg font-medium sm:text-xl text-gray-800 dark:text-gray-100">
                Konutlar
              </span>
            </div>
          </Link>
          <Link href="/reservations">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 sm:p-4 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <HiOutlineCalendar className="h-10 w-10 sm:h-12 sm:w-12 text-orange-500 mr-2 sm:mr-4" />
              <span className="text-lg font-medium sm:text-xl text-gray-800 dark:text-gray-100">
                Rezervasyon
              </span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 sm:p-4 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <HiOutlineUserCircle className="h-10 w-10 sm:h-12 sm:w-12 text-pink-500 mr-2 sm:mr-4" />
              <span className="text-lg font-medium sm:text-xl text-gray-800 dark:text-gray-100">
                Profil
              </span>
            </div>
          </Link>
          {/* Extra card for admins */}
          {isAdmin && (
            <Link href="/admin">
              <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 sm:p-4 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
                <HiOutlineShieldExclamation className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mr-2 sm:mr-4" />
                <span className="text-lg font-medium sm:text-xl text-gray-800 dark:text-gray-100">
                  Kullanıcılar
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
