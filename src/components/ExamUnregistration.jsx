import React, { useState } from 'react';
import { FaUserMinus } from 'react-icons/fa';
import styles from './ExamUnregistration.module.css';
import { getExamUnRegistrationData, unregisterExamStudent, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ExamUnregistration = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  const [registerNo, setRegisterNo] = useState('');
  const [gridData, setGridData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGrid, setShowGrid] = useState(false);

  const handleInputChange = (e) => {
    setRegisterNo(e.target.value);
    // Clear grid when input changes
    if (showGrid) {
      setShowGrid(false);
      setGridData([]);
      setError('');
    }
  };

  const handleUnregistration = async () => {
    if (!registerNo || registerNo.trim() === '') {
      alert('Please enter a Register Number');
      return;
    }

    // Validate registration number length (minimum 10 characters)
    if (registerNo.trim().length < 10) {
      alert('Registration number must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowGrid(false);

    try {
      const appData = getAppData();
      const regulation = appData?.regulation || appData?.Regulation || '';
      const course = appData?.course || appData?.Course || '';
      const examMY = appData?.examMY || appData?.examMy || appData?.ExamMy || '';

      if (!regulation || !course || !examMY) {
        alert('Please select Regulation, Course, and Exam M/Y from the header dropdowns');
        setIsLoading(false);
        return;
      }

      console.log('ExamUnregistration: Calling loaddata API with:', {
        regulation,
        course,
        examMY,
        regno: registerNo.trim()
      });

      // Fetch exam unregistration data
      const response = await getExamUnRegistrationData(regulation, course, examMY, registerNo.trim());
      
      console.log('ExamUnregistration: API response:', response);
      
      if (response && response.success && response.data) {
        // Handle both array and single object responses
        const papersData = Array.isArray(response.data) ? response.data : [response.data];
        
        if (papersData.length > 0) {
          // Filter only registered papers (REGD === 'Y')
          const registeredPapers = papersData.filter(item => {
            const regd = String(item.REGD || item.regd || item.Regd || '').toUpperCase();
            return regd === 'Y';
          });
          
          if (registeredPapers.length > 0) {
            // Map the data to include REGNO in each row
            const gridDataWithRegno = registeredPapers.map(item => ({
              ...item,
              REGNO: registerNo.trim()
            }));
            setGridData(gridDataWithRegno);
            setShowGrid(true);
            setError(''); // Clear any previous errors
          } else {
            // Some papers might be unregistered, but check if any are registered
            const hasAnyRegistered = papersData.some(item => {
              const regd = String(item.REGD || item.regd || item.Regd || '').toUpperCase();
              return regd === 'Y';
            });
            
            if (!hasAnyRegistered) {
              setError('This student has already been unregistered. Cannot unregister again.');
            } else {
              setError('No registered papers found for this registration number');
            }
            setGridData([]);
            setShowGrid(false);
          }
        } else {
          setError(response.message || 'No exam registration data found for this registration number');
          setGridData([]);
          setShowGrid(false);
        }
      } else {
        setError(response?.message || 'No exam registration data found');
        setGridData([]);
        setShowGrid(false);
      }
    } catch (err) {
      console.error('Error fetching exam unregistration data:', err);
      setError(err.message || 'Failed to fetch exam registration data. Please try again.');
      setGridData([]);
      setShowGrid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregisterSubmit = async () => {
    if (!registerNo || registerNo.trim() === '') {
      alert('Please enter a Register Number');
      return;
    }

    // Validate registration number length
    if (registerNo.trim().length < 10) {
      alert('Registration number must be at least 10 characters');
      return;
    }

    if (gridData.length === 0) {
      alert('No registered papers to unregister');
      return;
    }

    const confirmUnregister = window.confirm(
      `Are you sure you want to unregister ${registerNo} from all registered exams?`
    );
    
    if (!confirmUnregister) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const appData = getAppData();
      const regulation = appData?.regulation || appData?.Regulation || '';
      const course = appData?.course || appData?.Course || '';
      const examMY = appData?.examMY || appData?.examMy || appData?.ExamMy || '';

      if (!regulation || !course || !examMY) {
        alert('Please select Regulation, Course, and Exam M/Y from the header dropdowns');
        setIsLoading(false);
        return;
      }

      console.log('ExamUnregistration: Calling unregister API with:', {
        regulation,
        course,
        examMY,
        regno: registerNo.trim()
      });

      const response = await unregisterExamStudent(regulation, course, examMY, registerNo.trim());

      console.log('ExamUnregistration: Unregister API response:', response);

      if (response && response.success) {
        const message = response.message || `Successfully unregistered ${registerNo} from the exam`;
        alert(message);
        // Clear form and grid
        setRegisterNo('');
        setGridData([]);
        setShowGrid(false);
        setError('');
      } else {
        throw new Error(response?.message || 'Failed to unregister');
      }
    } catch (err) {
      console.error('Unregistration error:', err);
      const errorMessage = err.message || 'Failed to unregister';
      setError(errorMessage);
      alert(`Failed to unregister: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Exam Unregistration</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUserMinus className={styles.headerIcon} style={{ color: themeColor }} />
            EXAM UNREGISTRATION
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.formSection}>
        <label className={styles.label}>Register No.</label>
        <input
          type="text"
          value={registerNo}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUnregistration();
            }
          }}
          className={styles.input}
          placeholder="Enter Register Number..."
          disabled={isLoading}
        />
        <button
          type="button"
          className={styles.unregisterBtn}
          onClick={handleUnregistration}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'UnRegistration'}
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {showGrid && gridData.length > 0 && (
        <div className={styles.gridContainer}>
          <div className={styles.gridPanel}>
            <table className={styles.gridView}>
              <thead>
                <tr>
                  <th>REGNO</th>
                  <th>SEM</th>
                  <th>PCODE</th>
                  <th>PNAME</th>
                  <th>EXAMMY</th>
                  <th>REGSUP</th>
                  <th>REGD</th>
                </tr>
              </thead>
              <tbody>
                {gridData.map((item, index) => {
                  const regno = item.REGNO || item.regno || item.RegNo || '';
                  const sem = item.SEM || item.sem || item.Sem || '';
                  const pcode = item.PCODE || item.pcode || item.PCode || '';
                  const pname = item.PNAME || item.pname || item.PName || '';
                  const exammy = item.EXAMMY || item.exammy || item.ExamMy || '';
                  const regsup = item.REGSUP || item.regsup || item.RegSup || '';
                  const regd = item.REGD || item.regd || item.Regd || '';

                  return (
                    <tr key={index}>
                      <td>{regno}</td>
                      <td>{sem}</td>
                      <td>{pcode}</td>
                      <td>{pname}</td>
                      <td>{exammy}</td>
                      <td>{regsup}</td>
                      <td>{regd}</td>
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
              onClick={handleUnregisterSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Confirm UnRegistration'}
            </button>
          </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamUnregistration;

