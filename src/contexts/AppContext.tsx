"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { APIKeys } from "@/types";

interface AppContextType {
  // API Keys
  apiKeys: APIKeys | null;
  setApiKeys: (keys: APIKeys) => void;
  clearApiKeys: () => void;

  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Simple error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [apiKeys, setApiKeysState] = useState<APIKeys | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [error, setError] = useState<string | null>(null);

  // Load API keys from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ai-song-api-keys");
      if (stored) {
        setApiKeysState(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("Failed to load stored API keys:", err);
    }
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ai-song-theme");
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored as "light" | "dark" | "system");
      }
    } catch (err) {
      console.warn("Failed to load stored theme:", err);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      if (theme === "system") {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        if (mediaQuery.matches) {
          root.setAttribute("data-theme", "dark");
          root.classList.add("dark");
        } else {
          root.removeAttribute("data-theme");
          root.classList.remove("dark");
        }
      } else {
        if (theme === "dark") {
          root.setAttribute("data-theme", "dark");
          root.classList.add("dark");
        } else {
          root.removeAttribute("data-theme");
          root.classList.remove("dark");
        }
      }
    };

    // Apply theme immediately
    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
    
    return undefined;
  }, [theme]);

  const setApiKeys = (keys: APIKeys) => {
    setApiKeysState(keys);
    try {
      sessionStorage.setItem("ai-song-api-keys", JSON.stringify(keys));
    } catch (err) {
      console.warn("Failed to store API keys:", err);
    }
  };

  const clearApiKeys = () => {
    setApiKeysState(null);
    try {
      sessionStorage.removeItem("ai-song-api-keys");
    } catch (err) {
      console.warn("Failed to clear API keys:", err);
    }
  };

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("ai-song-theme", newTheme);
    } catch (err) {
      console.warn("Failed to store theme:", err);
    }
  };

  const clearError = () => setError(null);

  const contextValue: AppContextType = {
    apiKeys,
    setApiKeys,
    clearApiKeys,
    theme,
    setTheme,
    error,
    setError,
    clearError,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
