import React, { useState, useEffect, useCallback } from 'react';
import { FaDatabase } from 'react-icons/fa';
import styles from './SupplyLabRegisteredData.module.css';
import { getAppData, getSupplyLabBatches, getSupplyLabSemesters, getSupplyLabData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const SupplyLabRegisteredData = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const [formData, setFormData] = useState({
    batch: '',
    semester: ''
  });

  const [batchOptions, setBatchOptions] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await getSupplyLabBatches();
      if (response && response.success && Array.isArray(response.data)) {
        // Handle different field name variations (regu, REGU, Regu)
        const batches = response.data.map(item => {
          return item.regu || item.REGU || item.Regu || item.batch || item.BATCH || item;
        }).filter(Boolean);
        setBatchOptions(batches);
        // Set default batch if not set and batches are available
        if (batches.length > 0 && !formData.batch) {
          setFormData(prev => ({ ...prev, batch: batches[0] }));
        }
      } else {
        setError(response?.message || 'Failed to load batches');
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.message || 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }, [formData.batch]);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course) => {
    if (!course) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await getSupplyLabSemesters(course);
      if (response && response.success && Array.isArray(response.data)) {
        // Handle different field name variations (sem, SEM, Sem)
        const semesters = response.data.map(item => {
          return item.sem || item.SEM || item.Sem || item;
        }).filter(Boolean);
        setSemesterOptions(semesters);
        // Set default semester if not set and semesters are available
        if (semesters.length > 0 && !formData.semester) {
          setFormData(prev => ({ ...prev, semester: semesters[0] }));
        }
      } else {
        setError(response?.message || 'Failed to load semesters');
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setError(error.message || 'Failed to load semesters');
    } finally {
      setIsLoading(false);
    }
  }, [formData.semester]);

  // Fetch app data and load dropdowns on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const appDataObj = getAppData();
        if (appDataObj) {
          setAppData(appDataObj);
          const course = appDataObj.course || appDataObj.Course || '';
          
          // Load batches (no course required)
          await fetchBatches();
          
          // Load semesters (requires course)
          if (course) {
            await fetchSemesters(course);
          }
        } else {
          // Still load batches even if no app data
          await fetchBatches();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load initial data');
      }
    };

    loadInitialData();
  }, []); // Run only once on mount

  // Reload semesters when course changes
  useEffect(() => {
    if (appData) {
      const course = appData.course || appData.Course || '';
      if (course) {
        fetchSemesters(course);
      }
    }
  }, [appData, fetchSemesters]);

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on input change
  };

  const handleExport = async () => {
    if (!formData.batch || !formData.semester) {
      alert('Please select both Batch and Semester');
      return;
    }

    // Get app context data (Course, ExamMy from header)
    const appDataObj = getAppData();
    const course = appDataObj?.course || appDataObj?.Course || '';
    const examMy = appDataObj?.examMY || appDataObj?.examMy || appDataObj?.ExamMy || '';

    if (!course || !examMy) {
      alert('Please select Course and Exam M/Y from the header dropdowns');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      console.log('SupplyLabRegistered: Calling API with:', {
        course,
        examMy,
        sem: formData.semester,
        regu: formData.batch
      });

      const response = await getSupplyLabData(course, examMy, formData.semester, formData.batch);
      console.log('SupplyLabRegistered: API response:', response);

      if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Convert JSON to CSV
        const csvContent = convertJsonToCsv(response.data);
        
        // Generate filename
        const filename = `SupplyLabRegistered_Batch${formData.batch}_Sem${formData.semester}.csv`;
        
        // Download CSV file
        downloadCsv(csvContent, filename);
        
        alert(`Supply Lab Registered data downloaded successfully! (${response.data.length} records)`);
      } else {
        const message = response?.message || 'No supply lab registered data found for the specified criteria';
        setError(message);
        alert(message);
      }
    } catch (err) {
      console.error('Error exporting supply lab registered data:', err);
      const errorMessage = err.message || 'Failed to export supply lab registered data';
      setError(errorMessage);
      alert(`Failed to export: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Supply Lab Registered Data</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaDatabase className={styles.headerIcon} style={{ color: themeColor }} />
            SUPPLY LAB REGISTERED DATA
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
          <label className={styles.label}>Batch</label>
          <select
            name="batch"
            value={formData.batch}
            onChange={handleInputChange}
            className={styles.dropdown}
            disabled={isLoading}
          >
            {batchOptions.length > 0 ? (
              batchOptions.map((batch, index) => (
                <option key={index} value={batch}>
                  {batch}
                </option>
              ))
            ) : (
              <option value="20">20</option>
            )}
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
            {semesterOptions.length > 0 ? (
              semesterOptions.map((sem, index) => (
                <option key={index} value={sem}>
                  {sem}
                </option>
              ))
            ) : (
              <>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </>
            )}
          </select>
        </div>

        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={isLoading || isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export'}
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

export default SupplyLabRegisteredData;

