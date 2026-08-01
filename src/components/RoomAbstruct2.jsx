import React, { useState, useEffect, useCallback } from 'react';
import styles from './RoomAbstruct2.module.css';
import {
  getAppData,
  getRoomAllotmentSems,
  getRoomAllotmentSessions,
  getRoomAllotmentExamDates
} from '../utils/api';

const RoomAbstruct2 = () => {
  const [filters, setFilters] = useState({
    examType: '',
    semester: '',
    session: '',
    edate: '',
    regsup: ''
  });

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [edateOptions, setEdateOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [appData, setAppData] = useState(null);
  const [dropdownLoading, setDropdownLoading] = useState({
    semesters: false,
    sessions: false,
    edates: false
  });

  // ExamType options
  const examTypeOptions = [
    { value: '', label: 'Select Exa...' },
    { value: 'External', label: 'External' },
    { value: 'MID-I', label: 'MID-I' },
    { value: 'MID-II', label: 'MID-II' }
  ];

  // Regsup options
  const regsupOptions = [
    { value: '', label: 'Select Regsup' },
    { value: 'REG', label: 'REG' },
    { value: 'SUP', label: 'SUP' },
    { value: 'REG&SUP', label: 'REG&SUP' }
  ];

  // Helper to get exam type string for API
  const getExamTypeString = (value) => {
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
      if (data.course) {
        fetchSemesters(data.course);
      }
    }
  }, []);

  // Fetch semesters
  const fetchSemesters = useCallback(async (course) => {
    try {
      setDropdownLoading(prev => ({ ...prev, semesters: true }));
      const response = await getRoomAllotmentSems(course);
      if (response && response.success && Array.isArray(response.data)) {
        const sems = response.data.map(item => {
          const sem = item.Sem || item.sem || item.SEM || item;
          return sem ? String(sem) : '';
        }).filter(Boolean);
        setSemesterOptions(sems);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setSemesterOptions([]);
    } finally {
      setDropdownLoading(prev => ({ ...prev, semesters: false }));
    }
  }, []);

  // Fetch sessions when examType and semester change
  useEffect(() => {
    const fetchSessions = async () => {
      if (!filters.examType || !filters.semester || !appData?.course) {
        setSessionOptions([]);
        setFilters(prev => ({ ...prev, session: '', edate: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, sessions: true }));
        const examTypeStr = getExamTypeString(filters.examType);
        const response = await getRoomAllotmentSessions(
          appData.course,
          filters.semester,
          examTypeStr
        );
        if (response && response.success && Array.isArray(response.data)) {
          const sessions = response.data.map(item => {
            const session = item.Session || item.session || item.SESSION || item;
            return session ? String(session) : '';
          }).filter(Boolean);
          setSessionOptions(sessions);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessionOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, sessions: false }));
      }
    };

    fetchSessions();
  }, [filters.examType, filters.semester, appData]);

  // Fetch exam dates when session changes
  useEffect(() => {
    const fetchExamDates = async () => {
      if (!filters.session || !filters.semester || !filters.examType || 
          !appData?.course || !appData?.examMY || !appData?.regulation) {
        setEdateOptions([]);
        setFilters(prev => ({ ...prev, edate: '' }));
        return;
      }

      try {
        setDropdownLoading(prev => ({ ...prev, edates: true }));
        const examTypeStr = getExamTypeString(filters.examType);
        const response = await getRoomAllotmentExamDates(
          appData.course,
          filters.semester,
          appData.examMY,
          filters.session,
          appData.regulation,
          examTypeStr
        );
        if (response && response.success && Array.isArray(response.data)) {
          const dates = response.data.map(item => {
            const date = item.ExamDate || item.examDate || item.EDATE || item.EXAMDATE || item;
            return date ? String(date) : '';
          }).filter(Boolean);
          setEdateOptions(dates);
        }
      } catch (error) {
        console.error('Error fetching exam dates:', error);
        setEdateOptions([]);
      } finally {
        setDropdownLoading(prev => ({ ...prev, edates: false }));
      }
    };

    fetchExamDates();
  }, [filters.session, filters.semester, filters.examType, appData]);

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent dropdowns
      if (name === 'examType' || name === 'semester') {
        newFilters.session = '';
        newFilters.edate = '';
      }
      if (name === 'session') {
        newFilters.edate = '';
      }
      
      return newFilters;
    });
  };

  // Handle View button
  const handleView = () => {

    
    if (!filters.examType || !filters.semester || !filters.session || 
        !filters.edate || !filters.regsup) {
      alert('Please select all fields');
      return;
    }
    
    setIsLoading(true);
    setHasData(false);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setHasData(true);
    }, 500);
  };

  // Handle Download button
  const handleDownload = () => {
    if (!filters.examType || !filters.semester || !filters.session || 
        !filters.edate || !filters.regsup) {
      alert('Please select all fields');
      return;
    }
    
    // TODO: Implement download functionality
    alert('Download functionality will be implemented');
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>ExamType</label>
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
              disabled={dropdownLoading.semesters}
            >
              <option value="">select seme...</option>
              {semesterOptions.map(sem => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Session</label>
            <select
              className={styles.select}
              value={filters.session}
              onChange={(e) => handleFilterChange('session', e.target.value)}
              disabled={!filters.examType || !filters.semester || dropdownLoading.sessions}
            >
              <option value="">Select an Option</option>
              {sessionOptions.map(session => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Edate</label>
            <select
              className={styles.select}
              value={filters.edate}
              onChange={(e) => handleFilterChange('edate', e.target.value)}
              disabled={!filters.session || dropdownLoading.edates}
            >
              <option value="">Select an Option</option>
              {edateOptions.map(date => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Regsup</label>
            <select
              className={styles.select}
              value={filters.regsup}
              onChange={(e) => handleFilterChange('regsup', e.target.value)}
            >
              {regsupOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button
              className={styles.viewBtn}
              onClick={handleView}
              disabled={isLoading}
            >
              View
            </button>
            <button
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={isLoading}
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Report Area */}
      {hasData && (
        <div className={styles.reportArea}>
          <div className={styles.tablePlaceholder}>
            <p className={styles.tablePlaceholderText}>The table should be here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAbstruct2;

