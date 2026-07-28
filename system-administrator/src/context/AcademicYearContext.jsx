import React, { createContext, useState, useContext, useEffect } from 'react';

const AcademicYearContext = createContext();

export const useAcademicYear = () => {
  return useContext(AcademicYearContext);
};

export const AcademicYearProvider = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState('SY 2025-2026');

  useEffect(() => {
    const savedYear = localStorage.getItem('admin_academic_year');
    if (savedYear) {
      setSelectedYear(savedYear);
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
