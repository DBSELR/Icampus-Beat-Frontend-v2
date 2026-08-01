import React, { useState, useEffect } from 'react';
import styles from './CancelReceiptList.module.css';
import { getAppData, getCancelReceiptListCourses, getCancelReceiptListExamMYs, getCancelReceiptListData, exportCancelReceiptList } from '../utils/api';

const CancelReceiptList = () => {
  const [formData, setFormData] = useState({
    course: '',
    examMy: ''
  });

  const [courseOptions, setCourseOptions] = useState([]);
  const [examMyOptions, setExamMyOptions] = useState([]);
  const [cancelReceiptData, setCancelReceiptData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [hasData, setHasData] = useState(false);
  const [appData, setAppData] = useState(null);

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      if (data.regulation) {
        fetchCourses(data.regulation);
      }
      // Pre-fill if available
      if (data.course) {
        setFormData(prev => ({ ...prev, course: data.course }));
      }
      if (data.examMY || data.examMy) {
        setFormData(prev => ({ ...prev, examMy: data.examMY || data.examMy }));
      }
    }
  }, []);

  // Fetch courses
  const fetchCourses = async (regulation) => {
    try {
      setIsLoading(true);
      const response = await getCancelReceiptListCourses(regulation);
      if (response && response.success && Array.isArray(response.data)) {
        const courses = response.data.map(item => item.COURSE || item.course || item.Course || item).filter(Boolean);
        setCourseOptions(courses);
      } else {
        setError(response?.message || 'Failed to load courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch exammy when course changes
  useEffect(() => {
    const fetchExamMy = async () => {
      if (!formData.course || !appData?.regulation) {
        setExamMyOptions([]);
        setFormData(prev => ({ ...prev, examMy: '' }));
        setCancelReceiptData([]);
        setHasData(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await getCancelReceiptListExamMYs(appData.regulation, formData.course);
        if (response && response.success && Array.isArray(response.data)) {
          // API returns { exammy, emy } format
          const exammys = response.data.map(item => item.exammy || item.examMy || item.EXAMMY || item).filter(Boolean);
          setExamMyOptions(exammys);
        } else {
          setExamMyOptions([]);
          setError(response?.message || 'Failed to load exam month-years');
        }
      } catch (error) {
        console.error('Error fetching exammy:', error);
        setExamMyOptions([]);
        setError(error.message || 'Failed to load exam month-years');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamMy();
  }, [formData.course, appData]);

  // Load data when both course and examMy are selected
  useEffect(() => {
    if (formData.course && formData.examMy) {
      loadCancelReceiptData();
    } else {
      setCancelReceiptData([]);
      setHasData(false);
    }
  }, [formData.examMy]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    if (name === 'course') {
      // Reset examMy when course changes
      setFormData(prev => ({ ...prev, examMy: '' }));
      setCancelReceiptData([]);
      setHasData(false);
    }
  };

  // Load cancel receipt list data
  const loadCancelReceiptData = async () => {
    if (!formData.course || !formData.examMy) {
      return;
    }

    setIsLoadingData(true);
    setError('');
    setHasData(false);
    setCancelReceiptData([]);

    try {
      console.log('CancelReceiptList: Loading data with:', {
        course: formData.course,
        examMY: formData.examMy
      });

      const response = await getCancelReceiptListData(formData.course, formData.examMy);

      if (response && response.success && Array.isArray(response.data)) {
        setCancelReceiptData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No canceled receipt data found for the selected criteria');
        }
      } else {
        setError(response?.message || 'No canceled receipt data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading cancel receipt list data:', err);
      setError(err.message || 'Failed to load cancel receipt list data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoadingData(false);
    }
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

  // Handle export button
  const handleExport = async () => {
    if (!formData.course || !formData.examMy) {
      alert('Please select both Course and Exam M/Y');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('CancelReceiptList: Exporting data with:', {
        course: formData.course,
        examMY: formData.examMy
      });

      const response = await exportCancelReceiptList(formData.course, formData.examMy);

      if (response && response.success && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          alert('No data to export');
          return;
        }

        const csvContent = convertJsonToCsv(response.data);
        const filename = `CancelReceiptList_${formData.course}_${formData.examMy.replace(/\s+/g, '_')}.csv`;
        
        downloadCsv(csvContent, filename);
        
        alert(`Cancel Receipt List exported successfully! (${response.data.length} records)`);
      } else {
        throw new Error(response?.message || 'Failed to export cancel receipt list data');
      }
    } catch (err) {
      console.error('Error exporting cancel receipt list:', err);
      setError(err.message || 'Failed to export cancel receipt list data. Please try again.');
      alert(err.message || 'Failed to export cancel receipt list data');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Cancel Receipt List</h3>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filters}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Course:</label>
              <select
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                className={styles.dropdown}
                disabled={isLoading || !courseOptions.length}
              >
                <option value="">Select Course</option>
                {courseOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Exam M/Y:</label>
              <select
                name="examMy"
                value={formData.examMy}
                onChange={handleInputChange}
                className={styles.dropdown}
                disabled={isLoading || !examMyOptions.length || !formData.course}
              >
                <option value="">Select Exam M/Y</option>
                {examMyOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.viewBtn}
                onClick={loadCancelReceiptData}
                disabled={isLoadingData || !formData.course || !formData.examMy}
              >
                {isLoadingData ? 'Loading...' : 'View'}
              </button>
              <button
                type="button"
                className={styles.excelBtn}
                onClick={handleExport}
                disabled={isLoading || !formData.course || !formData.examMy}
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
        {!hasData && !isLoadingData && !error && (
          <div className={styles.placeholder}>
            Select Course and Exam M/Y, then click View to load the cancel receipt list.
          </div>
        )}
        {isLoadingData && <div className={styles.loadingState}>Loading cancel receipt list data…</div>}
        {hasData && !isLoadingData && cancelReceiptData.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>RECEIPTNO</th>
                  <th>Paid Date</th>
                  <th>REGNO</th>
                  <th>SEM</th>
                  <th>REGSUP</th>
                  <th>PCOUNT</th>
                  <th>APPFEE</th>
                  <th>EXAMFEE</th>
                  <th>FINEFEE</th>
                  <th>CONCESSION</th>
                  <th>Cancel Date</th>
                  <th>PAPERS</th>
                  <th>USERID</th>
                  <th>CUSERID</th>
                </tr>
              </thead>
              <tbody>
                {cancelReceiptData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>{row.RECEIPTNO || row.receiptNo || ''}</td>
                    <td>{formatDate(row.PaidDate || row.paidDate)}</td>
                    <td>{row.REGNO || row.regNo || ''}</td>
                    <td>{row.SEM || row.sem || ''}</td>
                    <td>{row.REGSUP || row.regSup || ''}</td>
                    <td>{row.PCOUNT || row.pCount || ''}</td>
                    <td>₹{row.APPFEE || row.appFee || 0}</td>
                    <td>₹{row.EXAMFEE || row.examFee || 0}</td>
                    <td>₹{row.FINEFEE || row.fineFee || 0}</td>
                    <td>₹{row.CONCESSION || row.concession || 0}</td>
                    <td>{formatDate(row.CancelDate || row.cancelDate)}</td>
                    <td className={styles.papersCell} title={row.PAPERS || row.papers || ''}>
                      {(row.PAPERS || row.papers || '').substring(0, 50)}
                      {(row.PAPERS || row.papers || '').length > 50 ? '...' : ''}
                    </td>
                    <td>{row.USERID || row.userId || ''}</td>
                    <td>{row.CUSERID || row.cUserId || ''}</td>
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

export default CancelReceiptList;
