import React, { useState, useEffect, useCallback } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import styles from './CreditsMismatch.module.css';
import { getAppData, getCreditsMismatchBatches, getCreditsMismatchExamMy, getCreditsMismatchSemesters, getCreditsMismatchData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const CreditsMismatch = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const [formData, setFormData] = useState({
    batch: '',
    batchRegu: '', // Store REGU value separately
    exammy: '',
    semester: ''
  });

  const [batchOptions, setBatchOptions] = useState([]);
  const [exammyOptions, setExammyOptions] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);

  // Fetch batches
  const fetchBatches = useCallback(async (regulation) => {
    if (!regulation) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await getCreditsMismatchBatches(regulation);
      if (response && response.success && Array.isArray(response.data)) {
        // API returns objects with REGU and BATCH fields
        // BATCH is formatted like "2018-2022", REGU is like "18"
        const batches = response.data.map(item => ({
          regu: item.REGU || item.regu || item.Regu || '',
          batch: item.BATCH || item.batch || item.Batch || ''
        })).filter(item => item.regu && item.batch);
        setBatchOptions(batches);
      } else {
        setError(response?.message || 'Failed to load batches');
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.message || 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch exammy options
  const fetchExammy = useCallback(async (regulation, course) => {
    if (!regulation || !course) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await getCreditsMismatchExamMy(course, regulation);
      if (response && response.success && Array.isArray(response.data)) {
        // Handle different field name variations
        const exammys = response.data.map(item => {
          return item.EXAMMY || item.exammy || item.ExamMy || item.examMy || item;
        }).filter(Boolean);
        setExammyOptions(exammys);
      } else {
        setError(response?.message || 'Failed to load exam month-years');
      }
    } catch (error) {
      console.error('Error fetching exammy:', error);
      setError(error.message || 'Failed to load exam month-years');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (regulation, examMy) => {
    if (!regulation || !examMy) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await getCreditsMismatchSemesters(regulation, examMy);
      if (response && response.success && Array.isArray(response.data)) {
        // Handle different field name variations
        const semesters = response.data.map(item => {
          return item.SEM || item.sem || item.Sem || item;
        }).filter(Boolean);
        setSemesterOptions(semesters);
      } else {
        setError(response?.message || 'Failed to load semesters');
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setError(error.message || 'Failed to load semesters');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch app data and load dropdowns on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const appDataObj = getAppData();
        if (appDataObj) {
          setAppData(appDataObj);
          const regulation = appDataObj.regulation || appDataObj.Regulation || '';
          const course = appDataObj.course || appDataObj.Course || '';
          
          // Load batches (requires regulation)
          if (regulation) {
            await fetchBatches(regulation);
          }
          
          // Load exammy (requires regulation and course)
          if (regulation && course) {
            await fetchExammy(regulation, course);
          }
        } else {
          setError('Please select Regulation and Course from header dropdowns');
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load initial data');
      }
    };

    loadInitialData();
  }, []); // Run only once on mount

  // Reload exammy when regulation or course changes
  useEffect(() => {
    if (appData) {
      const regulation = appData.regulation || appData.Regulation || '';
      const course = appData.course || appData.Course || '';
      if (regulation && course) {
        fetchExammy(regulation, course);
      }
    }
  }, [appData, fetchExammy]);

  // Fetch semesters when exammy changes
  useEffect(() => {
    if (formData.exammy && appData) {
      const regulation = appData.regulation || appData.Regulation || '';
      if (regulation) {
        fetchSemesters(regulation, formData.exammy);
      }
    } else {
      setSemesterOptions([]);
      setFormData(prev => ({ ...prev, semester: '' }));
    }
  }, [formData.exammy, appData, fetchSemesters]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'batch') {
      // Find the batch option to get REGU value
      const selectedBatch = batchOptions.find(b => b.batch === value);
      setFormData(prev => ({
        ...prev,
        batch: value,
        batchRegu: selectedBatch ? selectedBatch.regu : value // Use REGU for API, fallback to value if not found
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError(''); // Clear error on input change
  };

  const handleDownload = async () => {
    if (!formData.batch || !formData.exammy || !formData.semester) {
      alert('Please select Batch, Exammy, and Semester');
      return;
    }

    // Get app context data (Course, Regulation from header)
    const appDataObj = getAppData();
    const regulation = appDataObj?.regulation || appDataObj?.Regulation || '';
    const course = appDataObj?.course || appDataObj?.Course || '';

    if (!regulation || !course) {
      alert('Please select Regulation and Course from the header dropdowns');
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      // Use batchRegu (REGU value) for API call, fallback to batch if not set
      const batchValue = formData.batchRegu || formData.batch;
      
      console.log('CreditsMismatch: Calling API with:', {
        regulation,
        examMy: formData.exammy,
        batch: batchValue,
        course,
        sem: formData.semester
      });

      const response = await getCreditsMismatchData(
        regulation,
        formData.exammy,
        batchValue,
        course,
        formData.semester
      );
      console.log('CreditsMismatch: API response:', response);

      if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Convert JSON to CSV
        const csvContent = convertJsonToCsv(response.data);
        
        // Generate filename
        const filename = `CreditsMismatch_Batch${batchValue}_ExamMy${formData.exammy}_Sem${formData.semester}.csv`;
        
        // Download CSV file
        downloadCsv(csvContent, filename);
        
        alert(`Credits Mismatch data downloaded successfully! (${response.data.length} records)`);
      } else {
        const message = response?.message || 'No credits mismatch data found for the specified criteria';
        setError(message);
        alert(message);
      }
    } catch (err) {
      console.error('Error downloading credits mismatch data:', err);
      const errorMessage = err.message || 'Failed to download credits mismatch data';
      setError(errorMessage);
      alert(`Failed to download: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Credits Mismatch</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaExclamationTriangle className={styles.headerIcon} style={{ color: themeColor }} />
            CREDITS MISMATCH
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.headerBar}>
            <div className={styles.formGroup}>
          <label className={styles.label}>Batch</label>
          <select
            name="batch"
            value={formData.batch}
            onChange={handleInputChange}
            className={styles.dropdown}
            disabled={isLoading}
          >
            <option value="">Select Batch</option>
            {batchOptions.map((batch, index) => (
              <option key={index} value={batch.batch}>
                {batch.batch}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Exammy</label>
          <select
            name="exammy"
            value={formData.exammy}
            onChange={handleInputChange}
            className={styles.dropdown}
            disabled={isLoading}
          >
            <option value="">Select EXAMMY</option>
            {exammyOptions.map((exammy, index) => (
              <option key={index} value={exammy}>
                {exammy}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Semester</label>
          <select
            name="semester"
            value={formData.semester}
            onChange={handleInputChange}
            className={styles.dropdown}
            disabled={isLoading}
          >
            <option value="">Select Semester</option>
            {semesterOptions.map((sem, index) => (
              <option key={index} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownload}
          disabled={isLoading || isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </button>
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

export default CreditsMismatch;

