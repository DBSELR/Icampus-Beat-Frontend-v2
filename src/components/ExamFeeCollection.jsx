import React, { useState } from 'react';
import styles from './ExamFeeCollection.module.css';
import { getAppData, getExamFeeCollectionData, exportExamFeeCollection } from '../utils/api';

const ExamFeeCollection = () => {
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: ''
  });

  const [collectionData, setCollectionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDateFocus = (e) => {
    e.target.select();
  };

  // Convert JSON to CSV
  const convertJsonToCsv = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    
    // Create CSV header row
    const csvRows = [headers.map(h => `"${h}"`).join(',')];

    // Create CSV data rows
    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  // Download CSV file
  const downloadCsv = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  // Format date from YYYY-MM-DD to DD-MM-YYYY for API
  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Handle view button
  const handleView = async () => {
    if (!formData.fromDate || !formData.toDate) {
      alert('Please select both From and To dates');
      return;
    }

    // Validate date range
    const fromDate = new Date(formData.fromDate);
    const toDate = new Date(formData.toDate);
    if (toDate < fromDate) {
      alert('To Date must be greater than or equal to From Date');
      return;
    }

    // Get app context data
    const appData = getAppData();
    const course = appData?.course || appData?.Course || '';
    const examMY = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';
    const userID = appData?.userId || appData?.userID || appData?.UserID || '';

    if (!course || !examMY) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setCollectionData([]);

    try {
      const fDate = formatDateForAPI(formData.fromDate);
      const tDate = formatDateForAPI(formData.toDate);

      console.log('ExamFeeCollection: Fetching data with:', {
        examMY,
        course,
        fDate,
        tDate,
        userID
      });

      const response = await getExamFeeCollectionData(examMY, course, fDate, tDate, userID);

      if (response && response.success && Array.isArray(response.data)) {
        setCollectionData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No exam fee collection data found for the selected date range');
        }
      } else {
        setError(response?.message || 'No exam fee collection data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading exam fee collection data:', err);
      setError(err.message || 'Failed to load exam fee collection data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Excel export button
  const handleExcelExport = async () => {
    if (!formData.fromDate || !formData.toDate) {
      alert('Please select both From and To dates');
      return;
    }

    // Validate date range
    const fromDate = new Date(formData.fromDate);
    const toDate = new Date(formData.toDate);
    if (toDate < fromDate) {
      alert('To Date must be greater than or equal to From Date');
      return;
    }

    // Get app context data
    const appData = getAppData();
    const course = appData?.course || appData?.Course || '';
    const examMY = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';
    const regulation = appData?.regulation || appData?.Regulation || '';

    if (!course || !examMY || !regulation) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const fDate = formatDateForAPI(formData.fromDate);
      const tDate = formatDateForAPI(formData.toDate);

      console.log('ExamFeeCollection: Exporting data with:', {
        regulation,
        course,
        examMY,
        fDate,
        tDate
      });

      const response = await exportExamFeeCollection(regulation, course, examMY, fDate, tDate);

      if (response && response.success && Array.isArray(response.data)) {
        // Convert JSON to CSV
        if (response.data.length === 0) {
          alert('No data to export');
          return;
        }

        const csvContent = convertJsonToCsv(response.data);
        const filename = `ExamFeeCollection_${examMY}_${formData.fromDate}_${formData.toDate}.csv`;
        
        downloadCsv(csvContent, filename);
        
        alert(`Exam fee collection data exported successfully! (${response.data.length} records)`);
      } else {
        throw new Error(response?.message || 'Failed to export exam fee collection data');
      }
    } catch (err) {
      console.error('Error exporting exam fee collection:', err);
      setError(err.message || 'Failed to export exam fee collection data. Please try again.');
      alert(err.message || 'Failed to export exam fee collection data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Exam Fee Collection</h3>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.dateFilters}>
            <div className={styles.dateGroup}>
              <label className={styles.dateLabel}>Fee Collection Date From :</label>
              <input
                type="date"
                name="fromDate"
                className={styles.dateInput}
                value={formData.fromDate}
                onChange={handleInputChange}
                onFocus={handleDateFocus}
              />
            </div>

            <div className={styles.dateGroup}>
              <label className={styles.dateLabel}>Fee Collection Date To :</label>
              <input
                type="date"
                name="toDate"
                className={styles.dateInput}
                value={formData.toDate}
                onChange={handleInputChange}
                onFocus={handleDateFocus}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.viewBtn}
                onClick={handleView}
                disabled={isLoading}
              >
                {isLoading ? 'Loading…' : 'View'}
              </button>
              <button
                type="button"
                className={styles.excelBtn}
                onClick={handleExcelExport}
                disabled={isLoading}
              >
                {isLoading ? 'Exporting...' : 'Excel Export'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select the date range and click View to load the exam fee collection data.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading exam fee collection data…</div>}
        {hasData && !isLoading && collectionData.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {Object.keys(collectionData[0] || {}).map((key, index) => (
                    <th key={index}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collectionData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(collectionData[0] || {}).map((key, colIndex) => (
                      <td key={colIndex}>
                        {row[key] !== null && row[key] !== undefined ? String(row[key]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamFeeCollection;
