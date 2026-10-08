import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const AcademicYearContext = createContext();

export const useAcademicYear = () => {
  return useContext(AcademicYearContext);
};

export const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, 7 is August
  if (month >= 7) { // August or later
    return `SY ${year}-${year + 1}`;
  } else {
    return `SY ${year - 1}-${year}`;
  }
};

export const getYearNumber = (syString) => {
  const match = String(syString || '').match(/(\d{4})/);
  return match ? parseInt(match[1]) : 0;
};

export const extractAcademicYear = (item) => {
  if (!item) return null;
  
  // 1. Direct schoolYear / academicYear / sy string
  const direct = item.schoolYear || item.academicYear || item.sy;
  if (direct && typeof direct === 'string') {
    const match = direct.trim().match(/(\d{4})\s*[-–/]\s*(\d{4})/);
    if (match) return `SY ${match[1]}-${match[2]}`;
  }

  // 2. School years list (e.g. from dean_settings)
  if (Array.isArray(item.schoolYears)) {
    return item.schoolYears.map(sy => {
      const label = typeof sy === 'string' ? sy : sy?.label;
      const m = (label || '').match(/(\d{4})\s*[-–/]\s*(\d{4})/);
      return m ? `SY ${m[1]}-${m[2]}` : null;
    }).filter(Boolean);
  }

  // 3. Dates/timestamps
  const rawDate = item.createdAt || item.timestamp || item.publishedAt || item.date;
  if (rawDate) {
    const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = d.getMonth();
      const startYear = m >= 7 ? y : y - 1;
      return `SY ${startYear}-${startYear + 1}`;
    }
  }

  return null;
};

export const AcademicYearProvider = ({ children }) => {
  const currentAcademicYear = getCurrentAcademicYear();
  const [availableYears, setAvailableYears] = useState([currentAcademicYear]);
  const [selectedYear, setSelectedYear] = useState(() => {
    return localStorage.getItem('admin_academic_year') || currentAcademicYear;
  });

  // Listen to Firestore real collections to dynamically fetch existing academic years
  useEffect(() => {
    let submissionsYears = [];
    let groupsYears = [];
    let deanSettingsYears = [];
    let otherYears = [];

    const recalculateYears = () => {
      const set = new Set();
      [...submissionsYears, ...groupsYears, ...deanSettingsYears, ...otherYears].forEach(y => {
        if (y) set.add(y);
      });

      // If no records found yet, fallback strictly to the current academic year
      if (set.size === 0) {
        set.add(currentAcademicYear);
      }

      const sorted = Array.from(set).sort((a, b) => getYearNumber(b) - getYearNumber(a));
      setAvailableYears(sorted);

      // Verify that selectedYear is valid; if not, reset to current or latest available year
      setSelectedYear(prev => {
        if (prev === 'All') return prev;
        if (sorted.includes(prev)) return prev;
        const fallback = sorted.includes(currentAcademicYear) ? currentAcademicYear : sorted[0];
        localStorage.setItem('admin_academic_year', fallback);
        return fallback;
      });
    };

    const processSnapshot = (snap) => {
      const found = [];
      snap.docs.forEach(doc => {
        const sy = extractAcademicYear(doc.data());
        if (Array.isArray(sy)) {
          found.push(...sy);
        } else if (sy) {
          found.push(sy);
        }
      });
      return found;
    };

    const unsubSub = onSnapshot(collection(db, 'submissions'), snap => {
      submissionsYears = processSnapshot(snap);
      recalculateYears();
    }, err => console.warn('Submissions SY listen notice:', err.message));

    const unsubGroups = onSnapshot(collection(db, 'groups'), snap => {
      groupsYears = processSnapshot(snap);
      recalculateYears();
    }, err => console.warn('Groups SY listen notice:', err.message));

    const unsubDeanSettings = onSnapshot(collection(db, 'dean_settings'), snap => {
      deanSettingsYears = processSnapshot(snap);
      recalculateYears();
    }, err => console.warn('Dean Settings SY listen notice:', err.message));

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), snap => {
      otherYears = processSnapshot(snap);
      recalculateYears();
    }, err => console.warn('Advisers SY listen notice:', err.message));

    return () => {
      unsubSub();
      unsubGroups();
      unsubDeanSettings();
      unsubAdvisers();
    };
  }, [currentAcademicYear]);

  const changeYear = (year) => {
    setSelectedYear(year);
    localStorage.setItem('admin_academic_year', year);
  };

  const filterByAcademicYear = (items, dateField = 'timestamp') => {
    if (!Array.isArray(items)) return [];
    if (selectedYear === 'All') return items;
    
    const match = selectedYear.match(/(\d{4})-(\d{4})/);
    if (!match) return items;

    const startYear = parseInt(match[1]);
    const endYear = parseInt(match[2]);

    const startDate = new Date(`${startYear}-08-01T00:00:00Z`);
    const endDate = new Date(`${endYear}-07-31T23:59:59Z`);

    return items.filter(item => {
      if (!item) return false;

      // 1. Direct schoolYear / academicYear match
      const direct = item.schoolYear || item.academicYear || item.sy;
      if (direct && typeof direct === 'string') {
        const m = direct.match(/(\d{4})\s*[-–/]\s*(\d{4})/);
        if (m) {
          return parseInt(m[1]) === startYear && parseInt(m[2]) === endYear;
        }
      }

      // 2. Date match
      const rawDate = item[dateField] || item.createdAt || item.timestamp || item.publishedAt;
      if (!rawDate) return false;
      const itemDate = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      if (isNaN(itemDate.getTime())) return false;
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  return (
    <AcademicYearContext.Provider value={{ 
      selectedYear, 
      changeYear, 
      filterByAcademicYear, 
      availableYears, 
      academicYears: availableYears,
      currentAcademicYear 
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
};
