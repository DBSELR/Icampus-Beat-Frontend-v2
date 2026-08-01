import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronUp, FaTrash, FaCopy } from 'react-icons/fa';
import { getSemesterGradeBatches, getSemesterGradeGrid, getSemesterGradeReguMapping, saveSemesterGrade, deleteSemesterGrade, copySemesterGrades, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './SemesterGrades.module.css';

const SemesterGrades = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    batch: '',
    sgpaFrom: '',
    sgpaTo: '',
    grade: ''
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // Table data state
  const [tableData, setTableData] = useState([]);
  
  // Grid loading state
  const [gridLoading, setGridLoading] = useState(false);
  
  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Copy loading state
  const [copyLoading, setCopyLoading] = useState(false);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFormData, setCopyFormData] = useState({
    fromBatch: '',
    toBatch: ''
  });

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Batches state
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatchRegu, setSelectedBatchRegu] = useState('');
  
  // REGU mapping state
  const [reguMapping, setReguMapping] = useState([]);
  const [reguMappingLoading, setReguMappingLoading] = useState(false);

  // Fetch batches from API
  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course) {
        console.log('Course not found in localStorage');
        setBatches([]);
        setBatchesLoading(false);
        return;
      }

      const response = await getSemesterGradeBatches(course);

      if (response.success && response.data) {
        setBatches(response.data);
        console.log('Batches loaded:', response.data);
      } else {
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Fetch REGU mapping from API
  const fetchReguMapping = async () => {
    setReguMappingLoading(true);
    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course) {
        console.log('Course not found in localStorage');
        setReguMapping([]);
        setReguMappingLoading(false);
        return;
      }

      const response = await getSemesterGradeReguMapping(course, 'TBL_SEMGRADE');

      if (response.success && response.data) {
        setReguMapping(response.data);
        console.log('REGU mapping loaded:', response.data);
      } else {
        setReguMapping([]);
      }
    } catch (error) {
      console.error('Error fetching REGU mapping:', error);
      setReguMapping([]);
    } finally {
      setReguMappingLoading(false);
    }
  };

  // Fetch grid data from API
  const fetchGridData = async () => {
    setGridLoading(true);
    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course || !selectedBatchRegu) {
        console.log('Course or regulation not available');
        setTableData([]);
        setGridLoading(false);
        return;
      }

      const response = await getSemesterGradeGrid(course, selectedBatchRegu);

      if (response.success && response.data) {
        // Map API response to table data format using REGU mapping
        const mappedData = response.data.map((item, index) => {
          // Find the batch from REGU mapping
          const reguMap = reguMapping.find(map => map.regu === item.REGU);
          const batchDisplay = reguMap ? reguMap.BATCH : item.REGU;

          return {
            id: item.ID || index + 1,
            batch: batchDisplay, // Use BATCH from REGU mapping or fallback to REGU
            course: item.course || item.COURSE,
            sgpaFrom: item.SGPA_FROM || item.sgpaFrom || item.fromSgpa,
            sgpaTo: item.SGPA_TO || item.sgpaTo || item.toSgpa,
            grade: item.GR || item.grade || item.GRADE,
            regu: item.REGU // Store REGU for delete/update operations
          };
        });

        setTableData(mappedData);
        console.log('Grid data loaded:', mappedData);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching grid data:', error);
      setTableData([]);
    } finally {
      setGridLoading(false);
    }
  };

  // Load batches and REGU mapping on component mount
  useEffect(() => {
    fetchBatches();
    fetchReguMapping();
  }, []);

  // Load grid data when selectedBatchRegu changes
  useEffect(() => {
    if (selectedBatchRegu) {
      fetchGridData();
    }
  }, [selectedBatchRegu]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If batch is selected, extract and set regulation (REGU)
    if (name === 'batch' && value) {
      const selectedBatch = batches.find(batch => batch.BATCH === value);
      if (selectedBatch) {
        setSelectedBatchRegu(selectedBatch.REGU);
      }
    }
  };

  // Handle copy form input changes
  const handleCopyInputChange = (e) => {
    const { name, value } = e.target;
    setCopyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.batch) {
      alert('Please select a batch');
      return;
    }
    if (!formData.sgpaFrom || !formData.sgpaTo || !formData.grade) {
      alert('Please enter all the fields.');
      return;
    }

    // Check if SGPA values are valid numbers
    const fromValue = parseFloat(formData.sgpaFrom);
    const toValue = parseFloat(formData.sgpaTo);
    
    if (isNaN(fromValue) || isNaN(toValue)) {
      alert('Please enter valid SGPA values');
      return;
    }

    if (fromValue >= toValue) {
      alert('SGPA From value should be less than SGPA To value');
      return;
    }

    setSaveLoading(true);

    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course) {
        alert('Please select course from header dropdown');
        setSaveLoading(false);
      return;
    }

      // Prepare data for API
      const gradeData = {
        id: isEditMode ? selectedRecordId.toString() : "", // ID for update, empty for insert
        regu: selectedBatchRegu, // From selected batch
        sgpaFrom: formData.sgpaFrom.toString(), // Ensure string
        sgpaTo: formData.sgpaTo.toString(), // Ensure string
        grade: formData.grade.toUpperCase(),
        course: course
      };

      const response = await saveSemesterGrade(gradeData);

      if (response.success) {
        const message = isEditMode ? 'Grade updated successfully!' : 'Grade saved successfully!';
        alert(message);
        console.log('Semester grade saved:', response);
    
    // Reset form
    setFormData({
      batch: '',
      sgpaFrom: '',
      sgpaTo: '',
      grade: ''
    });

        // Reset edit mode
        setIsEditMode(false);
        setSelectedRecordId(null);

        // Refresh grid data
        fetchGridData();
      } else {
        alert('Failed to save grade: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving semester grade:', error);
      alert('Error saving grade: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle row click to edit
  const handleRowClick = (record) => {
    // Populate form with record data
    setFormData({
      batch: record.batch,
      sgpaFrom: record.sgpaFrom,
      sgpaTo: record.sgpaTo,
      grade: record.grade
    });
    
    // Set edit mode
    setIsEditMode(true);
    setSelectedRecordId(record.id);
    
    // Set the regulation from the record
    setSelectedBatchRegu(record.regu);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      batch: '',
      sgpaFrom: '',
      sgpaTo: '',
      grade: ''
    });
    
    // Reset edit mode
    setIsEditMode(false);
    setSelectedRecordId(null);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm(`Do you want to delete this record?`)) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await deleteSemesterGrade(id);

      if (response.success) {
      alert('Record deleted successfully!');
        console.log('Semester grade deleted:', response);

        // If deleted record was selected, clear form and exit edit mode
        if (selectedRecordId === id) {
          setFormData({
            batch: '',
            sgpaFrom: '',
            sgpaTo: '',
            grade: ''
          });
          setIsEditMode(false);
          setSelectedRecordId(null);
        }

        // Refresh grid data
        fetchGridData();
      } else {
        alert('Failed to delete record: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting semester grade:', error);
      alert('Error deleting record: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle copy grades
  const handleCopyGrades = async () => {
    if (!copyFormData.fromBatch) {
      alert('Please Select From Batch');
      return;
    }
    if (!copyFormData.toBatch) {
      alert('Please Select To Batch');
      return;
    }

    // Extract REGU values from selected batches
    const fromBatchObj = batches.find(batch => batch.BATCH === copyFormData.fromBatch);
    const toBatchObj = batches.find(batch => batch.BATCH === copyFormData.toBatch);

    if (!fromBatchObj || !toBatchObj) {
      alert('Invalid batch selection');
      return;
    }

    const fromRegu = fromBatchObj.REGU;
    const toRegu = toBatchObj.REGU;

    if (parseInt(fromRegu) >= parseInt(toRegu)) {
      alert('To Batch Must be Greater than From Batch');
      return;
    }

    setCopyLoading(true);

    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course) {
        alert('Please select course from header dropdown');
        setCopyLoading(false);
      return;
    }

      const response = await copySemesterGrades(fromRegu, toRegu, course, 'TBL_SEMGRADE');

      if (response.success) {
    alert('Grades copied successfully!');
        console.log('Semester grades copied:', response);

        // Close modal and reset form
    setShowCopyModal(false);
    setCopyFormData({
      fromBatch: '',
      toBatch: ''
    });

        // Refresh grid data if currently viewing the toBatch
        if (selectedBatchRegu === toRegu) {
          fetchGridData();
        }
      } else {
        alert('Failed to copy grades: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error copying grades:', error);
      alert('Error copying grades: ' + error.message);
    } finally {
      setCopyLoading(false);
    }
  };

  // Handle copy modal close
  const handleCloseCopyModal = () => {
    setShowCopyModal(false);
    setCopyFormData({
      fromBatch: '',
      toBatch: ''
    });
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Sem Grade Master
          </h2>
          <button 
            className={`${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>
        
        <div className={styles.boxContent}>
          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Batch</label>
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  className={styles.dropdown}
                  disabled={batchesLoading}
                >
                  <option value="">
                    {batchesLoading ? 'Loading batches...' : 'Select Batch'}
                  </option>
                  {batches.map((batch, index) => (
                    <option key={index} value={batch.BATCH}>
                      {batch.BATCH}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>SGPA</label>
                <div className={styles.sgpaInputs}>
                  <input
                    type="text"
                    name="sgpaFrom"
                    value={formData.sgpaFrom}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="From"
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                  <input
                    type="text"
                    name="sgpaTo"
                    value={formData.sgpaTo}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="To"
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Grade</label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Grade"
                  style={{ fontWeight: 'bold', color: 'indianred', textTransform: 'uppercase' }}
                  onKeyPress={(e) => {
                    if (!/[A-Za-z]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>

            <div className={styles.actionBar}>
              <button 
                onClick={handleSave} 
                className={styles.saveBtn}
                disabled={saveLoading}
              >
                {saveLoading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
              </button>
              <button onClick={handleCancel} className={styles.cancelBtn}>Cancel</button>
              <button 
                onClick={() => setShowCopyModal(true)} 
                className={styles.copyBtn}
                title="Copy Sem-Grades Data From Previous Batch"
              >
                <FaCopy />
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>SGPA From</th>
                  <th>SGPA To</th>
                  <th>Grade</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {gridLoading ? (
                  <tr>
                    <td colSpan="6" className={styles.centerText}>
                      Loading...
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.centerText}>
                      No data available. Please select a batch.
                    </td>
                  </tr>
                ) : (
                  tableData.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className={`${styles.tableRow} ${selectedRecordId === item.id ? styles.selectedRow : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                    <td className={styles.centerText}>{item.batch}</td>
                    <td className={styles.centerText}>{item.course}</td>
                    <td className={styles.centerText}>{item.sgpaFrom}</td>
                    <td className={styles.centerText}>{item.sgpaTo}</td>
                    <td className={styles.centerText}>
                      <span className={styles.gradeLink}>{item.grade}</span>
                    </td>
                    <td className={styles.centerText}>
                      <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click when clicking delete
                            handleDelete(item.id);
                          }}
                        className={styles.deleteBtn}
                        title="Delete"
                          disabled={deleteLoading}
                      >
                          {deleteLoading ? '...' : <FaTrash />}
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Copy Grades Data From Previous Batch</span>
              <button onClick={handleCloseCopyModal} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label>From Batch</label>
                <select
                  name="fromBatch"
                  value={copyFormData.fromBatch}
                  onChange={handleCopyInputChange}
                  className={styles.dropdown}
                  disabled={batchesLoading}
                >
                  <option value="">
                    {batchesLoading ? 'Loading batches...' : 'Select Batch'}
                  </option>
                  {batches.map((batch, index) => (
                    <option key={index} value={batch.BATCH}>
                      {batch.BATCH}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalFormGroup}>
                <label>To Batch</label>
                <select
                  name="toBatch"
                  value={copyFormData.toBatch}
                  onChange={handleCopyInputChange}
                  className={styles.dropdown}
                  disabled={batchesLoading}
                >
                  <option value="">
                    {batchesLoading ? 'Loading batches...' : 'Select Batch'}
                  </option>
                  {batches.map((batch, index) => (
                    <option key={index} value={batch.BATCH}>
                      {batch.BATCH}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={handleCopyGrades} 
                className={styles.saveBtn}
                disabled={copyLoading}
              >
                {copyLoading ? 'Copying...' : 'Copy'}
              </button>
              <button 
                onClick={handleCloseCopyModal} 
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterGrades; 