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
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // On mount, check if dark mode is enabled
  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    }
  }, []);

  const handleMouseEnter = () => {
    // Wait 0.5s before expanding
    hoverTimer.current = setTimeout(() => {
      setExpanded(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setExpanded(false);
  };

  const menuItems = [
    { name: "Home", icon: <FiHome size={20} />, href: "/navigation" },
    { name: "Customers", icon: <FiUsers size={20} />, href: "/customers" },
    { name: "Units", icon: <FiLayers size={20} />, href: "/units" },
    {
      name: "Reservations",
      icon: <FiCalendar size={20} />,
      href: "/reservations",
    },
    { name: "Profile", icon: <FiUser size={20} />, href: "/profile" },
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
      router.push("/auth");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

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
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
