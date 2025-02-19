"use client";

import Link from "next/link";
import "../globals.css";

export default function NavigationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-10 text-gray-800 dark:text-gray-100">
          Navigasyon
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <Link href="/customers">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-blue-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xl font-medium text-gray-800 dark:text-gray-100">
                Müşteriler
              </span>
            </div>
          </Link>
          <Link href="/units">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-green-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v4a1 1 0 001 1h3v7a1 1 0 001 1h6a1 1 0 001-1v-7h3a1 1 0 001-1V7a1 1 0 00-1-1h-3V4a1 1 0 00-1-1h-6a1 1 0 00-1 1v2H4a1 1 0 00-1 1z"
                />
              </svg>
              <span className="text-xl font-medium text-gray-800 dark:text-gray-100">
                Konutlar
              </span>
            </div>
          </Link>
          <Link href="/reservations">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-yellow-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10m-11 4h12m-14 4h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xl font-medium text-gray-800 dark:text-gray-100">
                Rezervasyonlar
              </span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 cursor-pointer transform hover:-translate-y-1 transition duration-300 hover:shadow-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-purple-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 15c2.627 0 5.096.756 7.121 2.046M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xl font-medium text-gray-800 dark:text-gray-100">
                Profil
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
