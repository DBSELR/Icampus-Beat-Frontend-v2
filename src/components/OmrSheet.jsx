import React, { useState, useEffect, useCallback } from 'react';
import styles from './OmrSheet.module.css';
import { getAppData, getOMRSheetSemesters, getOMRSheetExamDates, getOMRSheetRooms, getOMRSheetData, generateOMRNumbers, exportOMRData } from '../utils/api';

const OmrSheet = () => {
  const [filters, setFilters] = useState({
    semester: '',
    examDate: '',
    room: ''
  });

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [examDateOptions, setExamDateOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [omrData, setOmrData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState({
    semesters: false,
    examDates: false,
    rooms: false
  });
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
      const course = data.course || data.Course || '';
      const examMY = data.examMY || data.examMy || data.ExamMy || data.ExamMY || '';
      
      if (course && examMY) {
        fetchSemesters(course, examMY);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course, examMY) => {
    try {
      setIsLoadingDropdowns(prev => ({ ...prev, semesters: true }));
      setError('');
      const response = await getOMRSheetSemesters(course, examMY);
      
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          return item.SEM || item.sem || item.sem1 || item;
        }).filter(Boolean);
        setSemesterOptions(sems);
      } else {
        setError(response?.message || 'No semesters found');
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setError(error.message || 'Failed to load semesters');
    } finally {
      setIsLoadingDropdowns(prev => ({ ...prev, semesters: false }));
    }
  }, []);

  // Fetch exam dates when semester changes
  useEffect(() => {
    const fetchExamDatesData = async () => {
      if (!filters.semester || !appData) {
        setExamDateOptions([]);
        setRoomOptions([]);
        setFilters(prev => ({ ...prev, examDate: '', room: '' }));
        return;
      }

      const course = appData.course || appData.Course || '';
      const examMY = appData.examMY || appData.examMy || appData.ExamMy || appData.ExamMY || '';

      if (!course || !examMY) {
        setExamDateOptions([]);
        return;
      }

      try {
        setIsLoadingDropdowns(prev => ({ ...prev, examDates: true }));
        setError('');
        const response = await getOMRSheetExamDates(course, examMY, filters.semester);
        
        if (response && response.success && Array.isArray(response.data)) {
          const dates = response.data.map(item => {
            return item.EDATE || item.edate || item.edate1 || item;
          }).filter(Boolean);
          setExamDateOptions(dates);
        } else {
          setExamDateOptions([]);
        }
      } catch (error) {
        console.error('Error fetching exam dates:', error);
        setExamDateOptions([]);
      } finally {
        setIsLoadingDropdowns(prev => ({ ...prev, examDates: false }));
      }
    };

    fetchExamDatesData();
  }, [filters.semester, appData]);

  // Fetch rooms when exam date changes
  useEffect(() => {
    const fetchRoomsData = async () => {
      if (!filters.examDate || !filters.semester || !appData) {
        setRoomOptions([]);
        setFilters(prev => ({ ...prev, room: '' }));
        return;
      }

      const course = appData.course || appData.Course || '';
      const examMY = appData.examMY || appData.examMy || appData.ExamMy || appData.ExamMY || '';

      if (!course || !examMY) {
        setRoomOptions([]);
        return;
      }

      try {
        setIsLoadingDropdowns(prev => ({ ...prev, rooms: true }));
        setError('');
        const response = await getOMRSheetRooms(course, examMY, filters.semester, filters.examDate);
        
        if (response && response.success && Array.isArray(response.data)) {
          const rooms = response.data.map(item => {
            return item.ROOM || item.room || item.RoomNo || item.roomNo || item;
          }).filter(Boolean);
          setRoomOptions(rooms);
        } else {
          setRoomOptions([]);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setRoomOptions([]);
      } finally {
        setIsLoadingDropdowns(prev => ({ ...prev, rooms: false }));
      }
    };

    fetchRoomsData();
  }, [filters.examDate, filters.semester, appData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'semester') {
      setFilters({
        semester: value,
        examDate: '',
        room: ''
      });
      setExamDateOptions([]);
      setRoomOptions([]);
    } else if (name === 'examDate') {
      setFilters(prev => ({
        ...prev,
        examDate: value,
        room: ''
      }));
      setRoomOptions([]);
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  // Handle view button click
  const handleView = async () => {
    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasData(false);
    setOmrData([]);

    try {
      console.log('OMRSheet: Fetching data with:', {
        regulation,
        course,
        examMY,
        sem: filters.semester,
        edate: filters.examDate,
        room: filters.room
      });

      const response = await getOMRSheetData(
        regulation,
        course,
        examMY,
        filters.semester || '',
        filters.examDate || '',
        filters.room || ''
      );

      if (response && response.success && Array.isArray(response.data)) {
        setOmrData(response.data);
        setHasData(response.data.length > 0);
        if (response.data.length === 0) {
          setError('No OMR sheet data found for the selected criteria');
        }
      } else {
        setError(response?.message || 'No OMR sheet data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error loading OMR sheet data:', err);
      setError(err.message || 'Failed to load OMR sheet data. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle generate OMR numbers
  const handleGenerateOMRNumbers = async () => {
    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    if (!filters.semester || !filters.examDate || !filters.room) {
      alert('Please select Semester, Exam Date, and Room to generate OMR numbers');
      return;
    }

    if (!window.confirm('Are you sure you want to generate OMR numbers for the selected criteria?')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('OMRSheet: Generating OMR numbers with:', {
        regulation,
        course,
        examMY,
        sem: filters.semester,
        edate: filters.examDate,
        room: filters.room
      });

      const response = await generateOMRNumbers(
        regulation,
        course,
        examMY,
        filters.semester,
        filters.examDate,
        filters.room
      );

      if (response && response.success) {
        alert(`OMR numbers generated successfully! Total ranges: ${response.data?.totalRanges || 0}`);
        // Reload data after generation
        await handleView();
      } else {
        throw new Error(response?.message || 'Failed to generate OMR numbers');
      }
    } catch (err) {
      console.error('Error generating OMR numbers:', err);
      setError(err.message || 'Failed to generate OMR numbers. Please try again.');
      alert(err.message || 'Failed to generate OMR numbers');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export/download
  const handleExport = async () => {
    const data = getAppData();
    const course = data?.course || data?.Course || '';
    const regulation = data?.regulation || data?.Regulation || '';
    const examMY = data?.examMY || data?.examMy || data?.ExamMy || data?.ExamMY || '';

    if (!course || !regulation || !examMY) {
      alert('Please select Course, Regulation, and Exam M/Y from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('OMRSheet: Exporting data with:', { examMY, course, regulation });
      
      const response = await exportOMRData(examMY, course, regulation);

      if (response && response.success && Array.isArray(response.data)) {
        // Convert JSON to CSV
        if (response.data.length === 0) {
          alert('No data to export');
          return;
        }

        // Get all unique keys from all objects
        const allKeys = new Set();
        response.data.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);
        
        // Create CSV header row
        const csvRows = [headers.map(h => `"${h}"`).join(',')];

        // Create CSV data rows
        response.data.forEach(item => {
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

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `OMR_Data_${examMY}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        alert(`OMR data exported successfully! (${response.data.length} records)`);
      } else {
        throw new Error(response?.message || 'Failed to export OMR data');
      }
    } catch (err) {
      console.error('Error exporting OMR data:', err);
      setError(err.message || 'Failed to export OMR data. Please try again.');
      alert(err.message || 'Failed to export OMR data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={isLoadingDropdowns.semesters || isLoading || !semesterOptions.length}
            >
              <option value="">
                {isLoadingDropdowns.semesters ? 'Loading semesters...' : 'Select Semester'}
              </option>
              {semesterOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Exam Date</label>
            <select
              name="examDate"
              value={filters.examDate}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={isLoadingDropdowns.examDates || isLoading || !examDateOptions.length || !filters.semester}
            >
              <option value="">
                {isLoadingDropdowns.examDates ? 'Loading exam dates...' : 'Select Exam Date'}
              </option>
              {examDateOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Room</label>
            <select
              name="room"
              value={filters.room}
              onChange={handleFilterChange}
              className={styles.select}
              disabled={isLoadingDropdowns.rooms || isLoading || !roomOptions.length || !filters.examDate}
            >
              <option value="">
                {isLoadingDropdowns.rooms ? 'Loading rooms...' : 'Select Room'}
              </option>
              {roomOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actionsGroup}>
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
              className={styles.generateBtn}
              onClick={handleGenerateOMRNumbers}
              disabled={isLoading || !filters.semester || !filters.examDate || !filters.room}
            >
              Generate OMR Numbers
            </button>
          </div>
        </div>

        <div className={styles.exportSection}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={isLoading}
          >
            {isLoading ? 'Exporting...' : 'Download OMR Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select filters (optional) and click View to load OMR data, or click "Download OMR Data" to export all data.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading OMR data…</div>}
        {hasData && !isLoading && omrData.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {Object.keys(omrData[0] || {}).map((key, index) => (
                    <th key={index}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {omrData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(omrData[0] || {}).map((key, colIndex) => (
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

export default OmrSheet;
