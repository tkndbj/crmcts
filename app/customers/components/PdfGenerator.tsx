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
  // 1: Select user option ("user" or "all")
  // 2: Select call option ("cevapsizlar", "cevaplılar", "hepsi")
  // 3: Ask if sorting is desired ("evet" or "hayır")
  // 4 (if yes): Select sorting option from list
  const [step, setStep] = useState(1);
  const [userOption, setUserOption] = useState<"user" | "all">("user");
  const [callOption, setCallOption] = useState<
    "cevapsizlar" | "cevaplılar" | "hepsi"
  >("hepsi");
  const [sortingWanted, setSortingWanted] = useState<boolean | null>(null);
  const [selectedSortOption, setSelectedSortOption] = useState<string>("");

  // For the jade–green selection style for yes/no buttons:
  const baseBtnClasses = "rounded-full border px-4 py-2 transition-colors";
  const unselectedBtnClasses = "bg-transparent border-gray-400 text-gray-700";
  const selectedBtnClasses = "bg-green-500 border-green-500 text-white";

  // Handlers for navigation
  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => (s > 1 ? s - 1 : s));

  const generatePdf = () => {
    // Start with all customers
    let reportData = [...customers];
    // Step 1: Filter by user option if "user"
    if (userOption === "user" && currentUser) {
      reportData = reportData.filter((c) => c.owner === currentUser.uid);
    }
    // Step 2: Filter by call option
    if (callOption === "cevapsizlar") {
      reportData = reportData.filter((c) => c.lastCallDate === "00/00/0000");
    } else if (callOption === "cevaplılar") {
      reportData = reportData.filter((c) => c.lastCallDate !== "00/00/0000");
    }
    // Step 4: Sort if desired
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
          reportData.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "nameDesc":
          reportData.sort((a, b) => b.name.localeCompare(a.name));
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
            // Adjusted widths to accommodate the new column and reduce "İsim" and "Arayan" widths:
            widths: [30, 70, "*", 50, 70, 50, "*", 70],
            body: [
              // Updated header row with "İlgilendiği daire" inserted before "Açıklama":
              [
                "Sıra",
                "İsim",
                "E-posta",
                "Telefon",
                "Adres",
                "İlgilendiği daire",
                "Açıklama",
                "Arayan",
              ],
              ...reportData.map((customer, index) => [
                index + 1,
                customer.name || "",
                customer.email || "",
                customer.phone || "",
                customer.address || "",
                customer.interested || "",
                customer.description || "",
                customer.ownerName || "",
              ]),
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
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">
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
              <button onClick={goBack} className="text-2xl">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold">
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
                onClick={goNext}
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
              <button onClick={goBack} className="text-2xl">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold">
                3) Sıralama Yapmak İstiyor musunuz?
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
                    // Directly finish flow when "Hayır" is clicked (no sorting)
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
      case 4:
        // This step is only reached if sortingWanted === true.
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <button onClick={goBack} className="text-2xl">
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-bold">
                4) Sıralama Seçeneğini Belirleyin
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
            className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
          >
            <FiX size={20} />
          </button>
          {renderStep()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
