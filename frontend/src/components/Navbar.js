// ─── TopBar ───────────────────────────────────────────────────
// Sticky top header: page title + search + user avatar
// Rendered inside the main-area, to the right of the sidebar
// ─────────────────────────────────────────────────────────────

import React from "react";
import { useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";

const PAGE_TITLES = {
  "/":          "Dashboard",
  "/agents":    "Agents",
  "/create":    "New Agent",
  "/analytics": "Analytics",
  "/profile":   "Profile",
};

function getTitleForPath(pathname) {
  if (pathname.startsWith("/chat/")) return "Chat";
  return PAGE_TITLES[pathname] || "UniAgent";
}

export default function Navbar({ onToggleSidebar }) {
  const location = useLocation();
  const pageTitle = getTitleForPath(location.pathname);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="topbar-title">{pageTitle}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Search */}
        <div className="search-box">
          <SearchIcon />
          <span>Search...</span>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User */}
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--color-accent-lt)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "var(--color-accent)",
            cursor: "pointer", flexShrink: 0,
            border: "1px solid var(--color-border)",
          }}
          title="Admin"
        >
          A
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0,opacity:0.5}}>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" strokeLinecap="round" />
    </svg>
  );
}
