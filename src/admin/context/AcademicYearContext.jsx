import React, { createContext, useState, useContext, useEffect } from 'react';

const AcademicYearContext = createContext();

export const useAcademicYear = () => {
  return useContext(AcademicYearContext);
};

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, 7 is August
  if (month >= 7) { // August or later
    return `SY ${year}-${year + 1}`;
  } else {
    return `SY ${year - 1}-${year}`;
  }
};

const getYearNumber = (syString) => {
  const match = syString.match(/SY (\d{4})-\d{4}/);
  return match ? parseInt(match[1]) : 0;
};

export const AcademicYearProvider = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());

  useEffect(() => {
    const currentYear = getCurrentAcademicYear();
    const savedYear = localStorage.getItem('admin_academic_year');
    
    if (savedYear) {
      const currentStart = getYearNumber(currentYear);
      const savedStart = getYearNumber(savedYear);
      if (currentStart > savedStart) {
        // Upgrade to the current academic year automatically
        setSelectedYear(currentYear);
        localStorage.setItem('admin_academic_year', currentYear);
      } else {
        setSelectedYear(savedYear);
      }
    } else {
      setSelectedYear(currentYear);
      localStorage.setItem('admin_academic_year', currentYear);
    }
  }, []);

  const changeYear = (year) => {
    setSelectedYear(year);
    localStorage.setItem('admin_academic_year', year);
  };

  const filterByAcademicYear = (items, dateField = 'timestamp') => {
    if (selectedYear === 'All') return items;
    
    const match = selectedYear.match(/(\d{4})-(\d{4})/);
    if (!match) return items;

    const startYear = parseInt(match[1]);
    const endYear = parseInt(match[2]);

    const startDate = new Date(`${startYear}-08-01T00:00:00Z`);
    const endDate = new Date(`${endYear}-07-31T23:59:59Z`);

    return items.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = item[dateField].toDate ? item[dateField].toDate() : new Date(item[dateField]);
      if (isNaN(itemDate.getTime())) return false;
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  return (
    <AcademicYearContext.Provider value={{ selectedYear, changeYear, filterByAcademicYear }}>
      {children}
    </AcademicYearContext.Provider>
  );
};
