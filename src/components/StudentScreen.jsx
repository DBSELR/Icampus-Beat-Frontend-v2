import React, { useState, useEffect, useCallback } from 'react';
import { FaUser, FaChevronUp, FaChevronDown, FaTh } from 'react-icons/fa';
import { getStudentScreenInfo, getStudentMaxSem, getStudentScreenGrades, getAppData } from '../utils/api';
import styles from './StudentScreen.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const StudentScreen = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    registerNo: '',
    studentName: '',
    course: '',
    group: ''
  });

  // Student details state
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentImage, setStudentImage] = useState(null);
  const [maxSemester, setMaxSemester] = useState(8);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Semester data state - stores failed courses grouped by semester
  const [semesterData, setSemesterData] = useState({
    sem1: [],
    sem2: [],
    sem3: [],
    sem4: [],
    sem5: [],
    sem6: [],
    sem7: [],
    sem8: []
  });

  // Semester panels collapsed state (8 semesters)
  const [semesterCollapsed, setSemesterCollapsed] = useState({
    sem1: false,
    sem2: false,
    sem3: false,
    sem4: false,
    sem5: false,
    sem6: false,
    sem7: false,
    sem8: false
  });

  // Main section collapsed state
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);

  // Fetch student data
  const fetchStudentData = useCallback(async (regNo) => {
    if (!regNo || regNo.trim() === '') {
      // Clear all data if register no is empty
      setStudentDetails(null);
      setStudentImage(null);
      setFormData(prev => ({
        ...prev,
        studentName: '',
        course: '',
        group: ''
      }));
      setSemesterData({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setImageError(false);

    try {
      // Get examMy from app data
      const appData = getAppData();
      if (!appData?.examMY) {
        throw new Error('Please select Exam Month/Year from dropdown');
      }

      // Fetch student basic information
      const studentInfoResponse = await getStudentScreenInfo(regNo);
      
      if (studentInfoResponse.success && studentInfoResponse.data && studentInfoResponse.data.length > 0) {
        const studentInfo = studentInfoResponse.data[0];
        
        // Update form data
        setFormData(prev => ({
          ...prev,
          studentName: studentInfo.SNAME || '',
          course: studentInfo.COURSE || '',
          group: studentInfo.GRP || ''
        }));

        // Set student details
        setStudentDetails({
          registerNo: regNo,
          studentName: studentInfo.SNAME || '',
          course: studentInfo.COURSE || '',
          group: studentInfo.GRP || ''
        });

        // Load student image
        if (studentInfo.PHOTO) {
          // If PHOTO is a full URL, use it directly
          if (studentInfo.PHOTO.startsWith('http://') || studentInfo.PHOTO.startsWith('https://')) {
            setStudentImage(studentInfo.PHOTO);
          } else {
            // Otherwise, construct image URL from base URL
            const baseUrl = process.env.REACT_APP_BASE_URL || 'http://192.168.1.45:5127';
            const imageUrl = `${baseUrl}/api/StudentScreen/${regNo}/photo`;
            setStudentImage(imageUrl);
          }
        } else {
          // Try to load image from photo endpoint even if PHOTO is null
          // Some backends serve images via separate endpoint
          const baseUrl = process.env.REACT_APP_BASE_URL || 'http://192.168.1.45:5127';
          const imageUrl = `${baseUrl}/api/StudentScreen/${regNo}/photo`;
          setStudentImage(imageUrl);
        }

        // Fetch max semester (optional - for dynamic rendering)
        try {
          const maxSemResponse = await getStudentMaxSem(regNo);
          if (maxSemResponse.success && maxSemResponse.data && maxSemResponse.data.length > 0) {
            const maxSem = parseInt(maxSemResponse.data[0].MaxSem) || 8;
            setMaxSemester(maxSem);
          }
        } catch (err) {
          console.warn('Could not fetch max semester:', err);
          // Default to 8 if API fails
          setMaxSemester(8);
        }

        // Fetch failed courses/grades
        const gradesResponse = await getStudentScreenGrades(regNo, appData.examMY);
        
        if (gradesResponse.success && gradesResponse.data) {
          // Filter for failed courses (GR === "F") and group by semester
          const failedCourses = gradesResponse.data.filter(course => course.GR === 'F');
          
          const groupedData = {
            sem1: failedCourses.filter(c => c.SEM === '1'),
            sem2: failedCourses.filter(c => c.SEM === '2'),
            sem3: failedCourses.filter(c => c.SEM === '3'),
            sem4: failedCourses.filter(c => c.SEM === '4'),
            sem5: failedCourses.filter(c => c.SEM === '5'),
            sem6: failedCourses.filter(c => c.SEM === '6'),
            sem7: failedCourses.filter(c => c.SEM === '7'),
            sem8: failedCourses.filter(c => c.SEM === '8')
          };

          setSemesterData(groupedData);
        } else {
          // No failed courses found
          setSemesterData({
            sem1: [], sem2: [], sem3: [], sem4: [],
            sem5: [], sem6: [], sem7: [], sem8: []
          });
        }
      } else {
        throw new Error('Student not found');
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(err.message || 'Failed to fetch student data');
      setStudentDetails(null);
      setStudentImage(null);
      setFormData(prev => ({
        ...prev,
        studentName: '',
        course: '',
        group: ''
      }));
      setSemesterData({
        sem1: [], sem2: [], sem3: [], sem4: [],
        sem5: [], sem6: [], sem7: [], sem8: []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on input change with debouncing (like AutoPostBack in ASP.NET)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.registerNo.trim().length >= 3) {
        fetchStudentData(formData.registerNo.trim());
      } else if (formData.registerNo.trim().length === 0) {
        // Clear data if input is cleared
        fetchStudentData('');
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [formData.registerNo, fetchStudentData]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle register number search (manual trigger on Enter key)
  const handleRegisterNoSearch = () => {
    if (formData.registerNo.trim()) {
      fetchStudentData(formData.registerNo.trim());
    }
  };

  // Handle semester collapse
  const handleSemesterCollapse = (sem) => {
    setSemesterCollapsed(prev => ({
      ...prev,
      [sem]: !prev[sem]
    }));
  };

  // Get row class based on PAPRES (for styling like OnRowDataBound in ASP.NET)
  const getRowClassName = (paper) => {
    // All rows in this table are failed courses (GR === 'F'), so apply failed row styling
    if (paper.GR === 'F' || paper.PAPRES === 'F' || paper.PAPRES === 'N') {
      return styles.failedRow;
    }
    if (paper.REGD === 'Y') {
      return styles.registeredRow;
    }
    return '';
  };

  // Render semester table
  const renderSemesterTable = (semesterNumber, semesterKey) => {
    const courses = semesterData[semesterKey];

    if (courses.length === 0) {
      return (
        <div className={styles.emptyState}>
          No failed courses
        </div>
      );
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.semesterTable}>
          <thead>
            <tr>
              <th className={styles.codeCol}>Code</th>
              <th className={styles.nameCol}>Course Name(s) (Failed)</th>
              <th className={styles.creditCol}>Cr</th>
              <th className={styles.gradeCol}>Gr</th>
              <th className={styles.attemptCol}>Last Attempt</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((paper, index) => (
              <tr 
                key={`${paper.PCODE}-${index}`}
                className={getRowClassName(paper)}
              >
                <td className={styles.centerText}>{paper.PCODE}</td>
                <td>{paper.PNAME}</td>
                <td className={styles.centerText}>{paper.CR}</td>
                <td className={styles.centerText}>{paper.GR}</td>
                <td className={styles.centerText}>{paper.EXAMMY}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render semester panel
  const renderSemesterPanel = (semesterNumber, semesterKey) => {
    // Only show semesters up to maxSemester
    if (semesterNumber > maxSemester) {
      return null;
    }

    const courses = semesterData[semesterKey];
    
    // Optionally hide empty semesters (uncomment if needed)
    // if (courses.length === 0) {
    //   return null;
    // }

    return (
      <div className={styles.semesterPanel}>
        <div className={styles.semesterHeader}>
          <h3>
            <FaTh className={styles.semesterIcon} />
            Semester {semesterNumber}
          </h3>
          <button
            className={styles.collapseBtn}
            onClick={() => handleSemesterCollapse(semesterKey)}
            aria-label={`Toggle Semester ${semesterNumber}`}
          >
            {semesterCollapsed[semesterKey] ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        {!semesterCollapsed[semesterKey] && (
          <div className={styles.semesterContent}>
            {loading ? (
              <div className={styles.loadingState}>Loading...</div>
            ) : (
              renderSemesterTable(semesterNumber, semesterKey)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student Screen</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Main Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUser className={styles.headerIcon} style={{ color: themeColor }} />
            Student Data
          </h2>
          <button
            className={styles.collapseBtn}
            onClick={() => setIsMainCollapsed(!isMainCollapsed)}
            aria-label="Toggle Student Data Section"
          >
            {isMainCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>

        {!isMainCollapsed && (
          <div className={styles.cardBody}>
            {/* Loading Indicator */}
            {loading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loader}>Loading...</div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.formSection}>
              {/* Search Fields */}
              <div className={styles.searchFields}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Register No.</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      name="registerNo"
                      className={styles.input}
                      placeholder="Enter Register Number..."
                      value={formData.registerNo}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRegisterNoSearch();
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Student Name</label>
                  <input
                    type="text"
                    name="studentName"
                    className={styles.input}
                    value={formData.studentName}
                    onChange={handleInputChange}
                    readOnly={!!studentDetails}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Course</label>
                  <input
                    type="text"
                    name="course"
                    className={styles.input}
                    value={formData.course}
                    onChange={handleInputChange}
                    readOnly={!!studentDetails}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Group</label>
                  <input
                    type="text"
                    name="group"
                    className={styles.input}
                    value={formData.group}
                    onChange={handleInputChange}
                    readOnly={!!studentDetails}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Image Section */}
              <div className={styles.imageSection}>
                <div className={styles.imagePlaceholder}>
                  {studentImage && !imageError ? (
                    <img 
                      src={studentImage} 
                      alt="Student" 
                      className={styles.studentImage}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className={styles.noImageText}>
                      {loading ? 'Loading...' : 'No Image Available'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Semester Panels Section */}
        <div className={styles.semesterSection}>
          <div className={styles.semesterGrid}>
            {renderSemesterPanel(1, 'sem1')}
            {renderSemesterPanel(2, 'sem2')}
            {renderSemesterPanel(3, 'sem3')}
            {renderSemesterPanel(4, 'sem4')}
            {renderSemesterPanel(5, 'sem5')}
            {renderSemesterPanel(6, 'sem6')}
            {renderSemesterPanel(7, 'sem7')}
            {renderSemesterPanel(8, 'sem8')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentScreen;
