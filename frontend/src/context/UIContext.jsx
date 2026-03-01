import React, { createContext, useContext, useMemo, useState } from "react";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);

  const value = useMemo(
    () => ({
      isUserSidebarOpen,
      setIsUserSidebarOpen,
      openUserSidebar: () => setIsUserSidebarOpen(true),
      closeUserSidebar: () => setIsUserSidebarOpen(false),
      toggleUserSidebar: () => setIsUserSidebarOpen((prev) => !prev),
    }),
    [isUserSidebarOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within UIProvider");
  }
  return context;
};
