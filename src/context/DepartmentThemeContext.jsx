import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const PRESET_THEMES = {
  '#801e38': { primary: '#801e38', dark: '#590000', darker: '#400000', light: '#fdf2f8', accent: '#f8d070', name: 'Maroon' },
  '#ec4899': { primary: '#ec4899', dark: '#500724', darker: '#380519', light: '#fdf2f8', accent: '#f472b6', name: 'Pink' },
  '#2563eb': { primary: '#2563eb', dark: '#0f172a', darker: '#020617', light: '#eff6ff', accent: '#60a5fa', name: 'Blue' },
  '#059669': { primary: '#059669', dark: '#064e3b', darker: '#022c22', light: '#ecfdf5', accent: '#34d399', name: 'Green' },
  '#7c3aed': { primary: '#7c3aed', dark: '#2e1065', darker: '#1e0545', light: '#faf5ff', accent: '#a78bfa', name: 'Purple' },
  '#d97706': { primary: '#d97706', dark: '#451a03', darker: '#2a0e02', light: '#fffbeb', accent: '#fbbf24', name: 'Amber' },
  '#1e3a8a': { primary: '#1e3a8a', dark: '#0b1329', darker: '#050a17', light: '#eff6ff', accent: '#3b82f6', name: 'Navy' },
  '#dc2626': { primary: '#dc2626', dark: '#450a0a', darker: '#2d0404', light: '#fef2f2', accent: '#f87171', name: 'Crimson' },
  '#0d9488': { primary: '#0d9488', dark: '#042f2e', darker: '#021e1d', light: '#f0fdfa', accent: '#2dd4bf', name: 'Teal' },
  '#475569': { primary: '#475569', dark: '#0f172a', darker: '#020617', light: '#f8fafc', accent: '#94a3b8', name: 'Slate' },
};

const DEFAULT_THEME = {
  primary: '#801e38',
  dark: '#590000',
  darker: '#400000',
  light: '#fdf2f8',
  accent: '#f8d070',
  name: 'Default Maroon'
};

// Helper: darken a hex color by a factor (0 to 1)
function adjustColor(hex, factor) {
  try {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    let r = Math.round(((num >> 16) & 255) * factor);
    let g = Math.round(((num >> 8) & 255) * factor);
    let b = Math.round((num & 255) * factor);
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (_) {
    return hex;
  }
}

function computeTheme(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return DEFAULT_THEME;
  const lower = hexColor.toLowerCase();
  if (PRESET_THEMES[lower]) return PRESET_THEMES[lower];

  return {
    primary: hexColor,
    dark: adjustColor(hexColor, 0.42),
    darker: adjustColor(hexColor, 0.28),
    light: '#fcfbf7',
    accent: adjustColor(hexColor, 1.25),
    name: 'Custom'
  };
}

const DepartmentThemeContext = createContext({
  theme: DEFAULT_THEME,
  departmentName: '',
  departmentsList: [],
  getThemeForDepartment: () => DEFAULT_THEME
});

export function DepartmentThemeProvider({ children, userDepartment = '' }) {
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const depts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDepartmentsList(depts);
    }, (err) => {
      console.warn('Departments theme listener notice:', err.message);
    });
    return () => unsub();
  }, []);

  const getThemeForDepartment = (deptName) => {
    if (!deptName || typeof deptName !== 'string') return DEFAULT_THEME;
    const cleanSearch = deptName.trim().toLowerCase();

    const matched = departmentsList.find(d => {
      if (!d.name) return false;
      const dName = d.name.trim().toLowerCase();
      return dName === cleanSearch || cleanSearch.includes(dName) || dName.includes(cleanSearch);
    });

    if (matched && matched.color) {
      return computeTheme(matched.color);
    }
    return DEFAULT_THEME;
  };

  const activeTheme = useMemo(() => {
    return getThemeForDepartment(userDepartment);
  }, [userDepartment, departmentsList]);

  // Inject CSS variables into the root document for seamless CSS styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--dept-theme-primary', activeTheme.primary);
      root.style.setProperty('--dept-theme-dark', activeTheme.dark);
      root.style.setProperty('--dept-theme-darker', activeTheme.darker);
      root.style.setProperty('--dept-theme-accent', activeTheme.accent);
    }
  }, [activeTheme]);

  return (
    <DepartmentThemeContext.Provider value={{
      theme: activeTheme,
      departmentName: userDepartment,
      departmentsList,
      getThemeForDepartment
    }}>
      {children}
    </DepartmentThemeContext.Provider>
  );
}

export function useDepartmentTheme(customDept = null) {
  const ctx = useContext(DepartmentThemeContext);
  if (customDept) {
    return {
      ...ctx,
      theme: ctx.getThemeForDepartment(customDept)
    };
  }
  return ctx;
}

export default DepartmentThemeContext;
