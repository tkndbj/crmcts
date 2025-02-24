"use client";

import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseApp from "../../firebaseClient";
import "../globals.css";

// Register the required Chart.js components
Chart.register(ArcElement, Tooltip, Legend);

interface Customer {
  id: string;
  missedCall?: boolean;
  durum?: string;
  channel?: string;
  [key: string]: any;
}

export default function AnalyticsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const firestore = getFirestore(firebaseApp);
    const customersRef = collection(firestore, "customers");

    const unsubscribe = onSnapshot(
      customersRef,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];
        setCustomers(customersData);
      },
      (error) => {
        console.error("Error fetching customers:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Chart Data Calculations

  // 1. Cevaplılar / Cevapsızlar
  const answeredCount = customers.filter((c) => c.missedCall === false).length;
  const missedCount = customers.filter((c) => c.missedCall === true).length;
  const dataAnswered: ChartData<"pie", number[], unknown> = {
    labels: ["Cevaplılar", "Cevapsızlar"],
    datasets: [
      {
        data: [answeredCount, missedCount],
        backgroundColor: ["#4ade80", "#f87171"],
        hoverBackgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  // 2. Durum (olumlu, orta, olumsuz)
  const olumluCount = customers.filter(
    (c) => c.durum?.toLowerCase() === "olumlu"
  ).length;
  const ortaCount = customers.filter(
    (c) => c.durum?.toLowerCase() === "orta"
  ).length;
  const olumsuzCount = customers.filter(
    (c) => c.durum?.toLowerCase() === "olumsuz"
  ).length;
  const dataDurum: ChartData<"pie", number[], unknown> = {
    labels: ["Olumlu", "Orta", "Olumsuz"],
    datasets: [
      {
        data: [olumluCount, ortaCount, olumsuzCount],
        backgroundColor: ["#4ade80", "#facc15", "#f87171"],
        hoverBackgroundColor: ["#22c55e", "#eab308", "#ef4444"],
      },
    ],
  };

  // 3. Kanal (Whatsapp, Instagram, Facebook, Youtube, TikTok, Lead, Telefon, Website iletişim form)
  const channels = [
    "Whatsapp",
    "Instagram",
    "Facebook",
    "Youtube",
    "TikTok",
    "Lead",
    "Telefon",
    "Website iletişim form",
  ];
  const channelCounts = channels.map(
    (channel) =>
      customers.filter(
        (c) => c.channel && c.channel.toLowerCase() === channel.toLowerCase()
      ).length
  );
  const dataChannel: ChartData<"pie", number[], unknown> = {
    labels: channels,
    datasets: [
      {
        data: channelCounts,
        backgroundColor: [
          "#60a5fa",
          "#f472b6",
          "#34d399",
          "#fbbf24",
          "#a78bfa",
          "#fb923c",
          "#f87171",
          "#6b7280",
        ],
        hoverBackgroundColor: [
          "#3b82f6",
          "#ec4899",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#f97316",
          "#ef4444",
          "#4b5563",
        ],
      },
    ],
  };

  // Common Chart Options
  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-black dark:text-white">
          Analizler
        </h1>
        {/* Pie Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cevaplılar / Cevapsızlar Pie Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-black dark:text-white">
              Cevaplılar / Cevapsızlar
            </h2>
            <div className="relative h-64">
              <Pie data={dataAnswered} options={options} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-black dark:text-white">
                <span className="font-semibold">Cevaplılar:</span>{" "}
                {answeredCount}
              </p>
              <p className="text-black dark:text-white">
                <span className="font-semibold">Cevapsızlar:</span>{" "}
                {missedCount}
              </p>
            </div>
          </div>
          {/* Durum Pie Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-black dark:text-white">
              Durum
            </h2>
            <div className="relative h-64">
              <Pie data={dataDurum} options={options} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-black dark:text-white">
                <span className="font-semibold">Olumlu:</span> {olumluCount}
              </p>
              <p className="text-black dark:text-white">
                <span className="font-semibold">Orta:</span> {ortaCount}
              </p>
              <p className="text-black dark:text-white">
                <span className="font-semibold">Olumsuz:</span> {olumsuzCount}
              </p>
            </div>
          </div>
          {/* Kanal Pie Chart */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-black dark:text-white">
              Kanal
            </h2>
            <div className="relative h-64">
              <Pie data={dataChannel} options={options} />
            </div>
            <div className="mt-4">
              <ul className="text-black dark:text-white space-y-1 text-sm">
                {channels.map((channel, index) => (
                  <li key={channel} className="flex justify-between">
                    <span>{channel}</span>
                    <span className="font-semibold">
                      {channelCounts[index]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Detailed Statistics Section */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
            Detaylı İstatistikler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Customers */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Toplam Müşteriler
              </h3>
              <p className="text-3xl font-bold text-teal-500">
                {customers.length}
              </p>
            </div>
            {/* Answered Customers */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Cevaplılar
              </h3>
              <p className="text-3xl font-bold text-green-500">
                {answeredCount}
              </p>
            </div>
            {/* Missed Calls */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Cevapsızlar
              </h3>
              <p className="text-3xl font-bold text-red-500">{missedCount}</p>
            </div>
            {/* Durum Breakdown */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Olumlu
              </h3>
              <p className="text-3xl font-bold text-green-500">{olumluCount}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Orta
              </h3>
              <p className="text-3xl font-bold text-yellow-500">{ortaCount}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Olumsuz
              </h3>
              <p className="text-3xl font-bold text-red-500">{olumsuzCount}</p>
            </div>
            {/* Channel Details */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
                Kanal Dağılımı
              </h3>
              <ul className="space-y-2">
                {channels.map((channel, index) => (
                  <li
                    key={channel}
                    className="flex justify-between text-black dark:text-white"
                  >
                    <span>{channel}</span>
                    <span className="font-bold">{channelCounts[index]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
