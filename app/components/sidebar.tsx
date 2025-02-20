"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiLayers,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiSun,
  FiMoon,
} from "react-icons/fi";

// Import Firebase auth functions
import { getAuth, signOut } from "firebase/auth";
import firebaseApp from "../../firebaseClient";

const auth = getAuth(firebaseApp);

const Sidebar = () => {
  const [expanded, setExpanded] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Check if dark mode is enabled on mount
  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    }
  }, []);

  // Check screen size to determine if on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      // On mobile, we want the header version, so no expansion needed.
      if (window.innerWidth < 640) {
        setExpanded(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return; // Disable hover behavior on mobile
    hoverTimer.current = setTimeout(() => {
      setExpanded(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (isMobile) return; // Disable hover behavior on mobile
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setExpanded(false);
  };

  const menuItems = [
    { name: "Ana Sayfa", icon: <FiHome size={20} />, href: "/navigation" },
    { name: "Müşteriler", icon: <FiUsers size={20} />, href: "/customers" },
    { name: "Konutlar", icon: <FiLayers size={20} />, href: "/units" },
    {
      name: "Rezervasyonlar",
      icon: <FiCalendar size={20} />,
      href: "/reservations",
    },
    { name: "Profil", icon: <FiUser size={20} />, href: "/profile" },
  ];

  // Toggle between light and dark theme
  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  // Logout function: Sign out the user and navigate to the auth page.
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Mobile header version
  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 w-full h-16 bg-gray-800 dark:bg-gray-900 text-white flex items-center justify-between px-4 z-50">
        <nav className="flex space-x-4">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center px-2 py-2 transition-colors duration-300 ${
                  isActive
                    ? "bg-green-500"
                    : "hover:bg-gray-700 dark:hover:bg-gray-800"
                } rounded`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                {/* Optionally show text on larger screens */}
                <span className="hidden sm:inline ml-2">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded transition-colors"
          >
            {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Desktop vertical sidebar version
  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-0 left-0 h-screen bg-gray-800 dark:bg-gray-900 text-white transition-all duration-500 ${
        expanded ? "w-48" : "w-16"
      } flex flex-col justify-between`}
    >
      <nav className="mt-4 flex flex-col">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={index}
              href={item.href}
              className={`w-full flex items-center p-4 transition-colors duration-300 ${
                expanded ? "justify-start" : "justify-center"
              } ${
                isActive
                  ? "bg-green-500"
                  : "hover:bg-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {expanded && (
                <span className="ml-4 whitespace-nowrap transition-all duration-300">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer section with theme toggle and logout */}
      <div className="mb-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center p-4 transition-colors duration-300 hover:bg-gray-700 dark:hover:bg-gray-800"
        >
          <div className="flex-shrink-0">
            {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </div>
          {expanded && (
            <span className="ml-4 whitespace-nowrap transition-all duration-300">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-4 transition-colors duration-300 hover:bg-gray-700 dark:hover:bg-gray-800"
        >
          <div className="flex-shrink-0">
            <FiLogOut size={20} />
          </div>
          {expanded && (
            <span className="ml-4 whitespace-nowrap transition-all duration-300">
              Çıkış
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
