import React, { useState, useEffect, useCallback } from 'react';
import styles from './RoomwiseNominalRolls.module.css';
import {
  getAppData,
  getRoomWiseNominalRollsSemesters,
  getRoomWiseNominalRollsExamDates,
  getRoomWiseNominalRollsBranches,
  getRoomWiseNominalRollsData
} from '../utils/api';

const RoomwiseNominalRolls = () => {
  const [filters, setFilters] = useState({
    examType: '',
    semester: '',
    examDate: '',
    branch: ''
  });

  const [nominalRollsData, setNominalRollsData] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [autoPrint, setAutoPrint] = useState(false);
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    semesters: false,
    examDates: false,
    branches: false
  });

  // ExamType options - convert to API format (1=External, 2=MID-I, 3=MID-II)
  const examTypeOptions = [
    { value: '', label: 'Select ExamType' },
    { value: 'External', label: 'External' },
    { value: 'MID-I', label: 'MID-I' },
    { value: 'MID-II', label: 'MID-II' }
  ];

  // Helper to convert examType to API format
  const getExamTypeForAPI = (value) => {
    switch (value) {
      case 'External': return 'External';
      case 'MID-I': return 'MID-I';
      case 'MID-II': return 'MID-II';
      default: return '';
    }
  };

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      if (data.course && data.examMY) {
        fetchSemesters(data.course, data.examMY);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course, examMY) => {
    try {
      setDropdownLoading(prev => ({ ...prev, semesters: true }));
      const response = await getRoomWiseNominalRollsSemesters(course, examMY);
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          const sem = item.SEM || item.sem || item.sem1 || item;
          return sem ? String(sem) : '';
        }).filter(Boolean);
        setSemesterOptions(sems);
      } else {
        setSemesterOptions([]);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setSemesterOptions([]);
    } finally {
      setDropdownLoading(prev => ({ ...prev, semesters: false }));
    }
  }, []);

  // Fetch exam dates when semester and examType change
  useEffect(() => {
    const fetchExamDates = async () => {
      if (!filters.semester || !filters.examType || !appData?.course || !appData?.examMY || !appData?.regulation) {
        setExamDateOptions([]);
        setFilters(prev => ({ ...prev, examDate: '', branch: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, examDates: true }));
        const examTypeForAPI = getExamTypeForAPI(filters.examType);
        const response = await getRoomWiseNominalRollsExamDates(
          appData.course,
          filters.semester,
          appData.examMY,
          appData.regulation,
          examTypeForAPI
        );
        if (response && response.success && Array.isArray(response.data)) {
          // API returns {edate1: "07-05-2024", EDATE: "07-05-2024"} in dd-MM-yyyy format
          const dates = response.data.map(item => {
            const date = item.edate1 || item.EDATE || item.edate || item;
            return date ? String(date) : '';
          }).filter(Boolean);
          setExamDateOptions(dates);
        } else {
          setExamDateOptions([]);
        }
      } catch (error) {
        console.error('Error fetching exam dates:', error);
        setExamDateOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, examDates: false }));
      }
    };

    fetchExamDates();
  }, [filters.semester, filters.examType, appData]);

  // Fetch branches when exam date changes
  useEffect(() => {
    const fetchBranches = async () => {
      if (!filters.examDate || !filters.semester || !filters.examType || 
          !appData?.course || !appData?.examMY || !appData?.regulation) {
        setBranchOptions([]);
        setFilters(prev => ({ ...prev, branch: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, branches: true }));
        const examTypeForAPI = getExamTypeForAPI(filters.examType);
        // /branches API expects edate in dd-MM-yyyy format (e.g., 18-05-2024)
        const edateFormatted = filters.examDate || '';
        const response = await getRoomWiseNominalRollsBranches(
          appData.course,
          filters.semester,
          appData.examMY,
          appData.regulation,
          edateFormatted, // Pass date as-is in dd-MM-yyyy format
          examTypeForAPI
        );
        if (response && response.success && Array.isArray(response.data)) {
          // API returns {GRP, GSUB, Course}
          const branches = response.data.map(item => {
            const grp = item.GRP || item.grp || item;
            return grp ? String(grp) : '';
          }).filter(Boolean);
          setBranchOptions(branches);
        } else {
          setBranchOptions([]);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
        setBranchOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, branches: false }));
      }
    };

    fetchBranches();
  }, [filters.examDate, filters.semester, filters.examType, appData]);

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent dropdowns
      if (name === 'examType' || name === 'semester') {
        newFilters.examDate = '';
        newFilters.branch = '';
      }
      if (name === 'examDate') {
        newFilters.branch = '';
      }
      
      return newFilters;
    });
    setError('');
  };

  // Convert date from dd-MM-yyyy (dropdown format) to MM-dd-yyyy (API format)
  const convertDateForDataAPI = (dateString) => {
    if (!dateString) return '';
    // Date is in dd-MM-yyyy format from dropdown
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // dd-MM-yyyy -> MM-dd-yyyy (e.g., 18-05-2024 -> 05-18-2024)
      return `${parts[1]}-${parts[0]}-${parts[2]}`;
    }
    return dateString;
  };

  // Handle View button
  const handleView = async () => {
    // Validate required fields
    if (!filters.examType) {
      alert('Please select ExamType');
      return;
    }

    if (!appData?.course || !appData?.examMY || !appData?.regulation) {
      alert('Please select Course, Exam M/Y, and Regulation from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setNominalRollsData([]);

    try {
      const examTypeForAPI = getExamTypeForAPI(filters.examType);
      
      // API expects edate in MM-dd-yyyy format (e.g., 05-18-2024)
      const edateFormatted = filters.examDate ? convertDateForDataAPI(filters.examDate) : null;

      const params = {
        course: appData.course,
        examMY: appData.examMY,
        regulation: appData.regulation,
        examType: examTypeForAPI,
        sem: filters.semester || null,
        edate: edateFormatted, // Converted to MM-dd-yyyy format
        branch: filters.branch || null
      };

      console.log('RoomWiseNominalRolls: Calling API with:', params);

      const response = await getRoomWiseNominalRollsData(params);

      if (response && response.success && Array.isArray(response.data)) {
        setNominalRollsData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No room-wise nominal rolls data found for the selected criteria');
        }
      } else {
        setError(response?.message || 'No room-wise nominal rolls data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading room-wise nominal rolls data:', err);
      setError(err.message || 'Failed to load room-wise nominal rolls data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert JSON to CSV
  const convertJsonToCsv = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.map(h => `"${h}"`).join(',')];

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

  // Handle Download button
  const handleDownload = async () => {
    if (nominalRollsData.length === 0) {
      alert('No data to download. Please click View first.');
      return;
    }

    try {
      const csvContent = convertJsonToCsv(nominalRollsData);
      const filename = `RoomWiseNominalRolls_${appData?.course || 'Data'}_${filters.examType || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCsv(csvContent, filename);
      alert(`Room-wise Nominal Rolls data downloaded successfully! (${nominalRollsData.length} records)`);
    } catch (err) {
      console.error('Error downloading room-wise nominal rolls data:', err);
      alert('Failed to download room-wise nominal rolls data');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Room wise Nominal Rolls</h3>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Exam Type</label>
              <select
                className={styles.select}
                value={filters.examType}
                onChange={(e) => handleFilterChange('examType', e.target.value)}
              >
                {examTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Semester</label>
              <select
                className={styles.select}
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                disabled={dropdownLoading.semesters || !appData?.course || !appData?.examMY}
              >
                <option value="">Select Semester</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Exam Date</label>
              <select
                className={styles.select}
                value={filters.examDate}
                onChange={(e) => handleFilterChange('examDate', e.target.value)}
                disabled={!filters.semester || !filters.examType || dropdownLoading.examDates}
              >
                <option value="">Select Exam Date</option>
                {examDateOptions.map(date => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Branch</label>
              <select
                className={styles.select}
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                disabled={!filters.examDate || dropdownLoading.branches}
              >
                <option value="">Select Branch</option>
                {branchOptions.map(branch => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionsGroup}>
              <button
                className={styles.viewBtn}
                onClick={handleView}
                disabled={isLoading || !filters.examType}
              >
                {isLoading ? 'Loading…' : 'View'}
              </button>
              <button
                className={styles.downloadBtn}
                onClick={handleDownload}
                disabled={isLoading || !hasData || nominalRollsData.length === 0}
              >
                Download
              </button>
            </div>
          </div>

          <label className={styles.printReminder}>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(event) => setAutoPrint(event.target.checked)}
            />
            Check to Print or export from crystal report viewer after loading the report
          </label>
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
            Select filters (at least ExamType) and click View to load the room-wise nominal rolls.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading room-wise nominal rolls data…</div>}
        {hasData && !isLoading && nominalRollsData.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {Object.keys(nominalRollsData[0] || {}).map((key, index) => (
                    <th key={index}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nominalRollsData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(nominalRollsData[0] || {}).map((key, colIndex) => (
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

export default RoomwiseNominalRolls;
