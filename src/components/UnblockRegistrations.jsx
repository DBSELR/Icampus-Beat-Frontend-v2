import React, { useState, useEffect, useCallback } from 'react';
import { FaUnlockAlt } from 'react-icons/fa';
import styles from './UnblockRegistrations.module.css';
import { getUnblockExamMy, getBlockedStudents, unblockStudents } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const UnblockRegistrations = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const [exammy, setExammy] = useState('');
  const [exammyOptions, setExammyOptions] = useState([]);
  const [blockedStudents, setBlockedStudents] = useState([]);
  const [selectedRegnos, setSelectedRegnos] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState('');

  // Fetch exammy options on component mount
  useEffect(() => {
    const fetchExamMy = async () => {
      try {
        setIsLoading(true);
        const response = await getUnblockExamMy();
        if (response && response.success && Array.isArray(response.data)) {
          const exammys = response.data.map(item => 
            item.Exammy || item.exammy || item.EXAMMY || item
          ).filter(Boolean);
          setExammyOptions(exammys);
        } else {
          setError(response?.message || 'No exam month-years found');
        }
      } catch (error) {
        console.error('Error fetching exammy:', error);
        setError(error.message || 'Failed to load exam month-years');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamMy();
  }, []);

  // Load blocked students when exammy changes
  useEffect(() => {
    const loadBlockedStudents = async () => {
      if (!exammy || exammy === '') {
        setBlockedStudents([]);
        setSelectedRegnos(new Set());
        setSelectAll(false);
        return;
      }

      try {
        setIsLoadingData(true);
        setError('');
        const response = await getBlockedStudents(exammy);
        
        if (response && response.success && Array.isArray(response.data)) {
          setBlockedStudents(response.data);
          setSelectedRegnos(new Set());
          setSelectAll(false);
        } else {
          setBlockedStudents([]);
          setError(response?.message || 'No blocked students found');
        }
      } catch (error) {
        console.error('Error fetching blocked students:', error);
        setError(error.message || 'Failed to load blocked students');
        setBlockedStudents([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadBlockedStudents();
  }, [exammy]);

  const handleExammyChange = (e) => {
    setExammy(e.target.value);
    setSelectedRegnos(new Set());
    setSelectAll(false);
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    
    if (checked) {
      const allRegnos = new Set(blockedStudents.map(student => {
        const regno = student.Regno || student.regno || student.REGNO || '';
        return regno;
      }).filter(Boolean));
      setSelectedRegnos(allRegnos);
    } else {
      setSelectedRegnos(new Set());
    }
  };

  const handleSelectStudent = (regno) => {
    const newSelected = new Set(selectedRegnos);
    if (newSelected.has(regno)) {
      newSelected.delete(regno);
    } else {
      newSelected.add(regno);
    }
    setSelectedRegnos(newSelected);
    setSelectAll(newSelected.size === blockedStudents.length && blockedStudents.length > 0);
  };

  const handleSubmit = async () => {
    if (!exammy || exammy === '') {
      alert('Please select an Exammy');
      return;
    }

    if (selectedRegnos.size === 0) {
      alert('Please select at least one student to unblock');
      return;
    }

    const confirmUnblock = window.confirm(
      `Are you sure you want to unblock ${selectedRegnos.size} student(s)?`
    );
    
    if (!confirmUnblock) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const regnosArray = Array.from(selectedRegnos);
      const response = await unblockStudents(exammy, regnosArray);

      if (response && response.success) {
        const message = response.message || `Successfully unblocked ${selectedRegnos.size} student(s)`;
        alert(message);
        
        // Reload blocked students after successful unblock
        const reloadResponse = await getBlockedStudents(exammy);
        if (reloadResponse && reloadResponse.success && Array.isArray(reloadResponse.data)) {
          setBlockedStudents(reloadResponse.data);
        } else {
          setBlockedStudents([]);
        }
        
        setSelectedRegnos(new Set());
        setSelectAll(false);
      } else {
        throw new Error(response?.message || 'Failed to unblock students');
      }
    } catch (err) {
      console.error('Error unblocking students:', err);
      setError(err.message || 'Failed to unblock students');
      alert(`Failed to unblock: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Unblock Registrations</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUnlockAlt className={styles.headerIcon} style={{ color: themeColor }} />
            UNBLOCK REGISTRATIONS
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.formContainer}>
            <div className={styles.formGroup}>
          <label className={styles.label}>Exammy</label>
          <select
            value={exammy}
            onChange={handleExammyChange}
            className={styles.dropdown}
            disabled={isLoading}
          >
            <option value="">Select Exammy</option>
            {exammyOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {isLoadingData && (
          <div className={styles.loadingMessage}>
            Loading blocked students...
          </div>
        )}

        {blockedStudents.length > 0 && (
          <div className={styles.gridContainer}>
            <div className={styles.gridPanel}>
              <table className={styles.gridView}>
                <thead>
                  <tr>
                    <th>Regno</th>
                    <th>Exammy</th>
                    <th>Registration_status</th>
                    <th>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className={styles.checkbox}
                        />
                        Select All
                      </label>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blockedStudents.map((student, index) => {
                    const regno = student.Regno || student.regno || student.REGNO || '';
                    const exammyValue = student.Exammy || student.exammy || student.EXAMMY || '';
                    const status = student.Registration_status || student.registration_status || student.REGISTRATION_STATUS || '';
                    const isSelected = selectedRegnos.has(regno);

                    return (
                      <tr key={index} className={isSelected ? styles.selectedRow : ''}>
                        <td>{regno}</td>
                        <td>{exammyValue}</td>
                        <td>{status}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudent(regno)}
                            className={styles.checkbox}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.actionSection}>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isLoading || selectedRegnos.size === 0}
              >
                {isLoading ? 'Processing...' : `Submit (${selectedRegnos.size} selected)`}
              </button>
            </div>
          </div>
        )}

          {!isLoadingData && exammy && blockedStudents.length === 0 && !error && (
            <div className={styles.noDataMessage}>
              No blocked students found for selected Exammy
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default UnblockRegistrations;

