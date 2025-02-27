"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiX } from "react-icons/fi";
// @ts-ignore
import pdfMake from "pdfmake/build/pdfmake.js";
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts.js";
pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts?.vfs;

interface PdfGeneratorProps {
  customers: any[];
  currentUser: any;
  onComplete: () => void;
  onClose: () => void;
}

// Helper to parse date strings for sorting
function parseDateStr(dateStr: string) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return new Date(0);
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// getStatusColor now returns hex codes for our colors.
function getStatusColor(durum: string) {
  if (!durum) return "#ffffff"; // default white if no status
  switch (durum.toLowerCase()) {
    case "olumlu":
      return "#008000"; // green
    case "orta":
      return "#FFA500"; // orange
    case "olumsuz":
      return "#FF0000"; // red
    default:
      return "#ffffff";
  }
}

const sortOptionsData = [
  { value: "createdAsc", label: "Eklenme tarihine göre (eskiden yeniye)" },
  { value: "createdDesc", label: "Eklenme tarihine göre (yeniden eskiye)" },
  { value: "nameAsc", label: "Alfabetik" },
  { value: "nameDesc", label: "Alfabetik (tersden)" },
  { value: "lastCallAsc", label: "Son aranma tarihine göre (eskiden yeniye)" },
  { value: "lastCallDesc", label: "Son aranma tarihine göre (yeniden eskiye)" },
];

export default function PdfGenerator({
  customers,
  currentUser,
  onComplete,
  onClose,
}: PdfGeneratorProps) {
  // Steps:
  // 0: Select date filter ("Tarih Seç")
  // 1: Select user option ("user" or "all")
  // 2: Select call option ("cevapsizlar", "cevaplılar", "hepsi")
  // 3: (Conditional) Select durum filter ("olumlu", "olumsuz", "orta", "hepsi")
  // 4: Ask if sorting is desired ("evet" or "hayır")
  // 5 (if yes): Select sorting option from list

  const [step, setStep] = useState(0);

  // New state for date filter selection
  type DateOption =
    | "hepsi"
    | "bugunun"
    | "dunun"
    | "buHaftanin"
    | "tarihBelirle";

  const [dateFilterOption, setDateFilterOption] =
    useState<DateOption>("bugunun");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [userOption, setUserOption] = useState<"user" | "all">("user");
  const [callOption, setCallOption] = useState<
    "cevapsizlar" | "cevaplılar" | "hepsi"
  >("hepsi");
  const [durumOption, setDurumOption] = useState<
    "olumlu" | "olumsuz" | "orta" | "hepsi"
  >("hepsi");
  const [sortingWanted, setSortingWanted] = useState<boolean | null>(null);
  const [selectedSortOption, setSelectedSortOption] = useState<string>("");

  // For the yes/no button styles (used in step 4):
  const baseBtnClasses = "rounded-full border px-4 py-2 transition-colors";
  const unselectedBtnClasses =
    "bg-transparent border-gray-400 text-gray-700 dark:text-white";
  const selectedBtnClasses = "bg-green-500 border-green-500 text-white";

  // Navigation handlers
  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => (s > 0 ? s - 1 : s));

  const generatePdf = () => {
    // Start with all customers
    let reportData = [...customers];

    // Date filtering based on new step
    const now = new Date();
    if (dateFilterOption === "bugunun") {
      reportData = reportData.filter((c) => {
        const created = new Date(c.createdAt);
        return isSameDay(created, now);
      });
    } else if (dateFilterOption === "dunun") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      reportData = reportData.filter((c) => {
        const created = new Date(c.createdAt);
        return isSameDay(created, yesterday);
      });
    } else if (dateFilterOption === "buHaftanin") {
      // Calculate the most recent Monday (if today is Monday, it is today)
      const diff = (now.getDay() + 6) % 7; // converts Sunday (0) to 6, Monday (1) to 0, etc.
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      // Set time to start of the day
      monday.setHours(0, 0, 0, 0);
      reportData = reportData.filter((c) => {
        const created = new Date(c.createdAt);
        return created >= monday && created <= now;
      });
    } else if (dateFilterOption === "tarihBelirle") {
      // If custom dates are set, filter accordingly
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        reportData = reportData.filter((c) => {
          const created = new Date(c.createdAt);
          return created >= start && created <= end;
        });
      }
    }

    // Step 1: Filter by user option if "user"
    if (userOption === "user" && currentUser) {
      reportData = reportData.filter((c) => c.owner === currentUser.uid);
    }
    // Step 2: Filter by call option
    if (callOption === "cevapsizlar") {
      reportData = reportData.filter((c) => c.missedCall === true);
    } else if (callOption === "cevaplılar") {
      reportData = reportData.filter((c) => c.missedCall === false);
    }
    // Step 3: Filter by durum option (applied only if callOption !== "cevapsizlar")
    if (callOption !== "cevapsizlar" && durumOption !== "hepsi") {
      reportData = reportData.filter(
        (c) => c.durum && c.durum.toLowerCase() === durumOption
      );
    }
    // Step 5: Sort if desired
    if (sortingWanted && selectedSortOption) {
      switch (selectedSortOption) {
        case "createdAsc":
          reportData.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          break;
        case "createdDesc":
          reportData.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case "nameAsc":
          reportData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          break;
        case "nameDesc":
          reportData.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
          break;
        case "lastCallAsc":
          reportData.sort(
            (a, b) =>
              parseDateStr(a.lastCallDate).getTime() -
              parseDateStr(b.lastCallDate).getTime()
          );
          break;
        case "lastCallDesc":
          reportData.sort(
            (a, b) =>
              parseDateStr(b.lastCallDate).getTime() -
              parseDateStr(a.lastCallDate).getTime()
          );
          break;
        default:
          break;
      }
    }
    // Build the title based on user option
    const title =
      userOption === "user" && currentUser
        ? `${currentUser.displayName || currentUser.email}'nin Müşteri Raporu`
        : "Tüm Müşteri Raporu";

    const docDefinition: any = {
      pageOrientation: "landscape",
      content: [
        { text: title, style: "header" },
        {
          table: {
            // Updated widths for 10 columns:
            widths: [30, 70, 80, 50, 70, 50, 50, 60, "*", 70],
            body: [
              // New header row with "Aranma" column added before "Açıklama"
              [
                "Sıra",
                "İsim",
                "E-posta",
                "Telefon",
                "Adres",
                "İlgilendiği daire",
                "Kanal",
                "Aranma",
                "Açıklama",
                "Arayan",
              ],
              ...reportData.map((customer, index) => {
                const aranmaText =
                  (customer.lastCallDate || "") +
                  (customer.callDates && customer.callDates.length > 0
                    ? "\n" + customer.callDates.join("\n")
                    : "");
                const row = [
                  { text: index + 1 },
                  {
                    columns: [
                      {
                        text: customer.durum ? "●" : "",
                        color: customer.durum
                          ? getStatusColor(customer.durum)
                          : undefined,
                        fontSize: 10,
                        width: 10,
                      },
                      {
                        text: customer.name || "",
                        margin: [5, 0, 0, 0],
                      },
                    ],
                  },
                  customer.email || "",
                  customer.phone || "",
                  customer.address || "",
                  customer.interested || "",
                  customer.channel || "",
                  { text: aranmaText },
                  customer.description || "",
                  customer.ownerName || "",
                ];
                if (customer.missedCall) {
                  // Highlight the row by setting fillColor for each cell
                  return row.map((cell) => {
                    if (typeof cell === "object") {
                      return { ...cell, fillColor: "#ffffe0" };
                    } else {
                      return { text: cell, fillColor: "#ffffe0" };
                    }
                  });
                }
                return row;
              }),
            ],
          },
          layout: {
            paddingLeft: () => 0,
            paddingRight: () => 2,
            paddingTop: () => 2,
            paddingBottom: () => 2,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
          style: "tableCell",
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
        tableCell: { fontSize: 8 },
      },
    };

    pdfMake.createPdf(docDefinition).open();
  };

  // When the user finishes all steps, generate the PDF and call onComplete.
  const finishFlow = () => {
    generatePdf();
    onComplete();
  };

  // Render different UI per step.
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold dark:text-white">0) Tarih Seç</h2>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setDateFilterOption("hepsi")}
                className={`px-4 py-2 border rounded ${
                  dateFilterOption === "hepsi"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Hepsi
              </button>

              <button
                onClick={() => setDateFilterOption("bugunun")}
                className={`px-4 py-2 border rounded ${
                  dateFilterOption === "bugunun"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Bugünün
              </button>
              <button
                onClick={() => setDateFilterOption("dunun")}
                className={`px-4 py-2 border rounded ${
                  dateFilterOption === "dunun"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Dünün
              </button>
              <button
                onClick={() => setDateFilterOption("buHaftanin")}
                className={`px-4 py-2 border rounded ${
                  dateFilterOption === "buHaftanin"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Bu haftanın
              </button>
              <button
                onClick={() => setDateFilterOption("tarihBelirle")}
                className={`px-4 py-2 border rounded ${
                  dateFilterOption === "tarihBelirle"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Tarih belirle
              </button>
            </div>
            {dateFilterOption === "tarihBelirle" && (
              <div className="flex flex-col space-y-4">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border rounded"
                  placeholder="Başlangıç Tarihi"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border rounded"
                  placeholder="Bitiş Tarihi"
                />
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  // If "Tarih belirle" is selected, require both dates
                  if (
                    dateFilterOption === "tarihBelirle" &&
                    (!customStartDate || !customEndDate)
                  ) {
                    alert("Lütfen başlangıç ve bitiş tarihlerini seçin.");
                    return;
                  }
                  goNext();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Devam &gt;
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold dark:text-white">
              1) Müşteri Seçeneğini Belirleyin
            </h2>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setUserOption("user")}
                className={`px-4 py-2 border rounded ${
                  userOption === "user"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Kendi müşterilerim için
              </button>
              <button
                onClick={() => setUserOption("all")}
                className={`px-4 py-2 border rounded ${
                  userOption === "all"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Tüm müşteriler için
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={goNext}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Devam &gt;
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <button onClick={goBack} className="text-2xl dark:text-white">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold dark:text-white">
                2) Müşteri Alt Kümesini Seçin
              </h2>
            </div>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setCallOption("cevapsizlar")}
                className={`px-4 py-2 border rounded ${
                  callOption === "cevapsizlar"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Cevapsızlar
              </button>
              <button
                onClick={() => setCallOption("cevaplılar")}
                className={`px-4 py-2 border rounded ${
                  callOption === "cevaplılar"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Cevaplılar
              </button>
              <button
                onClick={() => setCallOption("hepsi")}
                className={`px-4 py-2 border rounded ${
                  callOption === "hepsi"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Hepsi
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  // Show step 3 (durum selection) for both "cevaplılar" and "hepsi"
                  if (callOption === "cevapsizlar") {
                    setStep(4);
                  } else {
                    setStep(3);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Devam &gt;
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <button onClick={goBack} className="text-2xl dark:text-white">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold dark:text-white">
                3) Durum seçin
              </h2>
            </div>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setDurumOption("olumlu")}
                className={`px-4 py-2 border rounded ${
                  durumOption === "olumlu"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Olumlular
              </button>
              <button
                onClick={() => setDurumOption("olumsuz")}
                className={`px-4 py-2 border rounded ${
                  durumOption === "olumsuz"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Olumsuzlar
              </button>
              <button
                onClick={() => setDurumOption("orta")}
                className={`px-4 py-2 border rounded ${
                  durumOption === "orta"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Ortalar
              </button>
              <button
                onClick={() => setDurumOption("hepsi")}
                className={`px-4 py-2 border rounded ${
                  durumOption === "hepsi"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Hepsi
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={goNext}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Devam &gt;
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // If the user had selected "cevapsizlar", go back to step 2;
                  // otherwise, return to step 3 (durum selection)
                  if (callOption === "cevapsizlar") {
                    setStep(2);
                  } else {
                    setStep(3);
                  }
                }}
                className="text-2xl dark:text-white"
              >
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold dark:text-white">
                4) Sıralama Yapmak İstiyor musunuz?
              </h2>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setSortingWanted(true);
                    goNext();
                  }}
                  className={`${baseBtnClasses} ${
                    sortingWanted === true
                      ? selectedBtnClasses
                      : unselectedBtnClasses
                  } flex-1`}
                >
                  Evet
                </button>
                <button
                  onClick={() => {
                    setSortingWanted(false);
                    finishFlow();
                  }}
                  className={`${baseBtnClasses} ${
                    sortingWanted === false
                      ? selectedBtnClasses
                      : unselectedBtnClasses
                  } flex-1`}
                >
                  Hayır
                </button>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <button onClick={goBack} className="text-2xl dark:text-white">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold dark:text-white">
                5) Sıralama Seçeneğini Belirleyin
              </h2>
            </div>
            <div className="flex flex-col space-y-4">
              {sortOptionsData.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedSortOption(opt.value)}
                  className={`px-4 py-2 border rounded ${
                    selectedSortOption === opt.value
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={finishFlow}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Raporu Oluştur
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
      >
        <motion.div
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black"
        ></motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-10 w-full max-w-md relative"
        >
          {/* Close Icon in top-right */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white"
          >
            <FiX size={20} />
          </button>
          {renderStep()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
