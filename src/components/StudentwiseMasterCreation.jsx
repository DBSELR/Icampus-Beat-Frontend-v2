import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronUp } from 'react-icons/fa';
import { getStudentMasterBranches, getStudentMasterSems, createStudentMaster, getAppData, getStudentSubjects } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './StudentwiseMasterCreation.module.css';

const StudentwiseMasterCreation = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    batch: '',
    semester: '',
    registrationNo: ''
  });

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // API data states
  const [branches, setBranches] = useState([]);
  const [sems, setSems] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [semsLoading, setSemsLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Student subjects table state
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Store selected batch object to access REGU
  const [selectedBatchObj, setSelectedBatchObj] = useState(null);

  // Fetch branches data
  const fetchBranches = async () => {
    try {
      setBranchesLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        return;
      }

      const response = await getStudentMasterBranches(
        appData.course,
        appData.examMY,
        appData.regulation
      );

      if (response.success && response.data) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      alert('Error loading branches data');
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch sems data
  const fetchSems = async () => {
    try {
      setSemsLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY || !appData?.regulation) {
        console.warn('Missing required data from localStorage:', appData);
        return;
      }

      const response = await getStudentMasterSems(
        appData.course,
        appData.examMY,
        appData.regulation
      );

      if (response.success && response.data) {
        setSems(response.data);
      }
    } catch (error) {
      console.error('Error fetching sems:', error);
      alert('Error loading sems data');
    } finally {
      setSemsLoading(false);
    }
  };

  // Fetch student subjects data
  const fetchStudentSubjects = async () => {
    // Validate required fields before fetching
    if (!formData.batch || !formData.semester || !formData.registrationNo) {
      setStudentSubjects([]);
      return;
    }

    // Validate that we have the batch object with REGU
    if (!selectedBatchObj || !selectedBatchObj.REGU) {
      console.warn('Missing batch REGU:', selectedBatchObj);
      setStudentSubjects([]);
      return;
    }

    try {
      setSubjectsLoading(true);
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY) {
        console.warn('Missing required data from localStorage:', appData);
        setStudentSubjects([]);
        return;
      }

      // Use the REGU from the selected batch object
      const response = await getStudentSubjects(
        appData.course,
        appData.examMY,
        selectedBatchObj.REGU,  // Use batch's REGU (e.g., "20") instead of global regulation (e.g., "R20")
        formData.semester,
        formData.registrationNo
      );

      if (response.success && response.data) {
        setStudentSubjects(response.data);
      } else {
        setStudentSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching student subjects:', error);
      setStudentSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBranches();
    fetchSems();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If batch is being changed, store the batch object
    if (name === 'batch') {
      const batchObj = branches.find(b => b.BATCH === value);
      setSelectedBatchObj(batchObj || null);
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle registration number blur (similar to AutoPostBack in .NET)
  const handleRegNoBlur = () => {
    if (formData.registrationNo && formData.batch && formData.semester) {
      fetchStudentSubjects();
    }
  };

  // Handle create
  const handleCreate = async () => {
    // Validation
    if (!formData.batch || formData.batch === 'Select Batch') {
      alert('Please Select Batch');
      return;
    }
    if (!formData.semester || formData.semester === 'Select Sem') {
      alert('Please Select Sem');
      return;
    }
    if (!formData.registrationNo) {
      alert('Please Enter To RegistrationNo');
      return;
    }

    setCreateLoading(true);

    try {
      const appData = getAppData();

      if (!appData?.course || !appData?.examMY) {
        alert('Missing course or examMY data. Please select from header dropdowns.');
        return;
      }

      // Use REGU for batch if available (based on user's curl example where batch="20")
      const batchValue = selectedBatchObj?.REGU || formData.batch;

      const masterData = {
        course: appData.course,
        examMy: appData.examMY,
        batch: batchValue,
        sem: formData.semester,
        regno: formData.registrationNo
      };

      const response = await createStudentMaster(masterData);

      if (response.success) {
        alert('Student Master created successfully!');
        console.log('Student master created:', response);

        // Reset form
        setFormData({
          batch: '',
          semester: '',
          registrationNo: ''
        });
        setStudentSubjects([]);
      } else {
        alert('Failed to create student master: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating student master:', error);
      alert('Error creating student master: ' + error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Student Wise Master Creation
          </h2>
          <button
            className={`${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={styles.boxContent}>
          <div className={`${styles.formSection} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.formContainer}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Batch</label>
                  <select
                    name="batch"
                    value={formData.batch}
                    onChange={handleInputChange}
                    className={styles.dropdown}
                    disabled={branchesLoading}
                  >
                    <option value="">Select Batch</option>
                    {branches.map(branch => (
                      <option key={branch.BATCH} value={branch.BATCH}>
                        {branch.BATCH}
                      </option>
                    ))}
                  </select>
                  {branchesLoading && <div className={styles.loadingText}>Loading batches...</div>}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sem</label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className={styles.dropdown}
                    disabled={semsLoading}
                  >
                    <option value="">Select Sem</option>
                    {sems.map(sem => (
                      <option key={sem.SEM} value={sem.SEM}>
                        {sem.SEM}
                      </option>
                    ))}
                  </select>
                  {semsLoading && <div className={styles.loadingText}>Loading sems...</div>}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Registsration No.</label>
                  <input
                    type="text"
                    name="registrationNo"
                    value={formData.registrationNo}
                    onChange={handleInputChange}
                    onBlur={handleRegNoBlur}
                    className={styles.input}
                    placeholder="Enter Registration Number"
                    style={{
                      fontWeight: 'bold',
                      color: 'indianred',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Student Subjects Table - GridView equivalent */}
          {studentSubjects.length > 0 && (
            <div className={styles.tableContainer}>
              <table className={styles.gridView}>
                <thead>
                  <tr>
                    <th>BATCH</th>
                    <th>SEM</th>
                    <th>REGNO</th>
                    <th>STREAM</th>
                    <th>COURSE</th>
                    <th>GRP</th>
                    <th>PNO</th>
                    <th>PCODE</th>
                    <th>PCODE1</th>
                    <th>PNAME</th>
                    <th>CREDITS</th>
                    <th>ELEC</th>
                    <th>REGULATION</th>
                    <th>SUB_CR</th>
                    <th>MAXMRK</th>
                    <th>PMAX</th>
                    <th>SMAX</th>
                    <th>TMAX</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsLoading ? (
                    <tr>
                      <td colSpan="18" style={{ textAlign: 'center', padding: '20px' }}>
                        Loading subjects...
                      </td>
                    </tr>
                  ) : (
                    studentSubjects.map((subject, index) => (
                      <tr key={index}>
                        <td>{subject.BATCH}</td>
                        <td>{subject.SEM}</td>
                        <td>{subject.REGNO}</td>
                        <td>{subject.STREAM}</td>
                        <td>{subject.COURSE}</td>
                        <td>{subject.GRP}</td>
                        <td>{subject.PNO}</td>
                        <td>{subject.PCODE}</td>
                        <td>{subject.PCODE1 || subject.PCODE}</td>
                        <td>{subject.PNAME}</td>
                        <td>{subject.CREDITS}</td>
                        <td>{subject.ELEC || 'Y'}</td>
                        <td>{subject.REGULATION}</td>
                        <td>{subject.SUB_CR}</td>
                        <td>{subject.MAXMRK}</td>
                        <td>{subject.PMAX}</td>
                        <td>{subject.SMAX}</td>
                        <td>{subject.TMAX}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}


          <div className={styles.actionBar}>
            <button
              onClick={handleCreate}
              className={styles.createBtn}
              disabled={createLoading}
            >
              {createLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentwiseMasterCreation; 