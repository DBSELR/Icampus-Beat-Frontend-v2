import React, { useState } from 'react';
import { FaFileInvoiceDollar } from 'react-icons/fa';
import styles from './ConsolidatedFeeReport.module.css';
import { exportConsolidatedFeeReport, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ConsolidatedFeeReport = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date input focus - select all text
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
        // Handle null, undefined, and objects
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Escape quotes and wrap in quotes
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

  // Handle export button
  const handleExport = async () => {
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

    // Get app context data (Regulation, Course, ExamMY from header)
    const appData = getAppData();
    const regulation = appData?.regulation || appData?.Regulation || '';
    const course = appData?.course || appData?.Course || '';
    const examMY = appData?.examMY || appData?.examMy || appData?.ExamMy || appData?.ExamMY || '';

    if (!regulation || !course || !examMY) {
      alert('Please select Regulation, Course, and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Format dates from YYYY-MM-DD to DD-MM-YYYY for API
      const formatDateForAPI = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fDate = formatDateForAPI(formData.fromDate);
      const tDate = formatDateForAPI(formData.toDate);

      console.log('ConsolidatedFeeReport: Calling API with:', {
        regulation,
        course,
        examMY,
        fDate,
        tDate
      });

      const response = await exportConsolidatedFeeReport(regulation, course, examMY, fDate, tDate);
      console.log('ConsolidatedFeeReport: API response:', response);

      if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Convert JSON to CSV
        const csvContent = convertJsonToCsv(response.data);
        
        // Generate filename with date range
        const fromDateStr = formData.fromDate.replace(/-/g, '');
        const toDateStr = formData.toDate.replace(/-/g, '');
        const filename = `ConsolidatedFeeReport_${fromDateStr}_${toDateStr}.csv`;
        
        // Download CSV file
        downloadCsv(csvContent, filename);
        
        alert(`Consolidated Fee Report downloaded successfully! (${response.data.length} records)`);
      } else {
        const message = response?.message || 'No fee data found for the specified criteria';
        setError(message);
        alert(message);
      }
    } catch (err) {
      console.error('Error downloading consolidated fee report:', err);
      const errorMessage = err.message || 'Failed to download consolidated fee report';
      setError(errorMessage);
      alert(`Failed to download: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Consolidated Fee Report</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaFileInvoiceDollar className={styles.headerIcon} style={{ color: themeColor }} />
            CONSOLIDATED FEE REPORT
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fee Collection Date From :</label>
              <input
                type="date"
                name="fromDate"
                className={styles.input}
                value={formData.fromDate}
                onChange={handleInputChange}
                onFocus={handleDateFocus}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Fee Collection Date To :</label>
              <input
                type="date"
                name="toDate"
                className={styles.input}
                value={formData.toDate}
                onChange={handleInputChange}
                onFocus={handleDateFocus}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={handleExport}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Consolidated Fee Report'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedFeeReport;

