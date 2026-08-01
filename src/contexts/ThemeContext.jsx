import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme definitions with colors
export const themes = [
  { name: "Ocean", value: "ocean", color: "#0ea5e9" },
  { name: "Emerald", value: "emerald", color: "#10b981" },
  { name: "Amethyst", value: "amethyst", color: "#8b5cf6" },
  { name: "Ruby", value: "ruby", color: "#f43f5e" },
  { name: "Amber", value: "amber", color: "#f59e0b" },
  { name: "Midnight", value: "midnight", color: "#0f172a" },
  { name: "Slate", value: "slate", color: "#475569" },
  { name: "Cerise", value: "cerise", color: "#ec4899" },
  { name: "Teal", value: "teal", color: "#14b8a6" }
];

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to determine if a color is light or dark
const isLightColor = (hexColor) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// Helper function to generate rgba from hex
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get theme from localStorage or default to 'ocean'
    const savedTheme = localStorage.getItem('icampus-theme');
    // If the saved theme is no longer in our list (e.g. from the old themes), default to ocean
    const isValidTheme = themes.some(t => t.value === savedTheme);
    return isValidTheme ? savedTheme : 'ocean';
  });

  const getCurrentThemeColor = () => {
    const theme = themes.find(t => t.value === currentTheme);
    return theme ? theme.color : '#0ea5e9'; // Default to ocean if not found
  };

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('icampus-theme', themeName);
  };

  // Apply theme CSS variables when theme changes
  useEffect(() => {
    const themeColor = getCurrentThemeColor();
    const isLight = isLightColor(themeColor);

    // Set CSS custom properties on document root
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--theme-color-light', hexToRgba(themeColor, 0.1));
    document.documentElement.style.setProperty('--theme-color-medium', hexToRgba(themeColor, 0.2));
    document.documentElement.style.setProperty('--theme-text-on-theme', isLight ? '#333' : '#fff');

    // For light themes (Journal, Simplex, Spacelab), use a darker accent for visibility
    if (isLight) {
      document.documentElement.style.setProperty('--theme-accent', '#333');
    } else {
      document.documentElement.style.setProperty('--theme-accent', themeColor);
    }
  }, [currentTheme]);

  const value = {
    currentTheme,
    changeTheme,
    getCurrentThemeColor,
    themes,
    isLightTheme: isLightColor(getCurrentThemeColor())
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
