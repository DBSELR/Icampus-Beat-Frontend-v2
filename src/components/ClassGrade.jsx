import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronUp, FaTrash, FaFileAlt, FaCopy, FaFileExport } from 'react-icons/fa';
import { getClassGradeBatches, getClassGradeGrid, saveClassGrade, deleteClassGrade, copyClassGrades, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './ClassGrade.module.css';

const ClassGrade = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    batch: '',
    sgpaFrom: '',
    sgpaTo: '',
    class: ''
  });

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

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

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

      const response = await getClassGradeBatches(course);

      if (response.success && response.data) {
        setBatches(response.data);
        console.log('Class Grade batches loaded:', response.data);
      } else {
        setBatches([]);
      }
    } catch (error) {
      console.error('Error fetching class grade batches:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
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

      const response = await getClassGradeGrid(course, selectedBatchRegu);

      if (response.success && response.data) {
        // Map API response to table data format
        const mappedData = response.data.map((item, index) => {
          // Find the batch that matches the REGU from the response
          const matchingBatch = batches.find(batch => batch.REGU === item.REGU);
          const batchDisplay = matchingBatch ? matchingBatch.BATCH : item.REGU;

          return {
            id: item.ID || index + 1,
            batch: batchDisplay, // Use BATCH from batches array or fallback to REGU
            course: item.course || item.COURSE,
            sgpaFrom: item.SGPA_FROM || item.sgpaFrom || item.fromSgpa,
            sgpaTo: item.SGPA_TO || item.sgpaTo || item.toSgpa,
            class: item.CLASS || item.class || item.CLASS_GRADE,
            regu: item.REGU || item.regu // Store REGU for delete/update operations
          };
        });

        setTableData(mappedData);
        console.log('Class Grade grid data loaded:', mappedData);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching class grade grid data:', error);
      setTableData([]);
    } finally {
      setGridLoading(false);
    }
  };

  // Load batches on component mount
  useEffect(() => {
    fetchBatches();
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

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.batch) {
      alert('Please select a batch');
      return;
    }
    if (!formData.sgpaFrom || !formData.sgpaTo || !formData.class) {
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

      // Find the selected batch object to get REGU
      const selectedBatch = batches.find(batch => batch.BATCH === formData.batch);
      if (!selectedBatch) {
        alert('Invalid batch selection');
        setSaveLoading(false);
        return;
      }

      // Prepare data for API
      const classGradeData = {
        id: isEditMode ? selectedRecordId.toString() : "", // Convert ID to string for updates, empty for new records
        regu: selectedBatch.REGU, // REGU from selected batch
        sgpaFrom: parseFloat(formData.sgpaFrom), // Convert to number
        sgpaTo: parseFloat(formData.sgpaTo), // Convert to number
        className: formData.class.toUpperCase(),
        course: course
      };

      const response = await saveClassGrade(classGradeData);

      if (response.success) {
        const message = isEditMode ? 'Class grade updated successfully!' : 'Class grade saved successfully!';
        alert(message);
        console.log('Class grade saved:', response);

        // Reset form
        setFormData({
          batch: '',
          sgpaFrom: '',
          sgpaTo: '',
          class: ''
        });

        // Reset edit mode
        setIsEditMode(false);
        setSelectedRecordId(null);

        // Refresh grid data
        fetchGridData();
      } else {
        alert('Failed to save class grade: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving class grade:', error);
      alert('Error saving class grade: ' + error.message);
    } finally {
      setSaveLoading(false);
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

  // Handle copy grades
  const handleCopyGrades = async () => {
    console.log('Copy button in modal clicked - executing copy operation');
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

      const response = await copyClassGrades(fromRegu, toRegu, course);

      if (response.success) {
        alert('Class grades copied successfully!');
        console.log('Class grades copied:', response);

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
        alert('Failed to copy class grades: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error copying class grades:', error);
      alert('Error copying class grades: ' + error.message);
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

  // Handle row click to edit
  const handleRowClick = (record) => {
    // Populate form with record data
    setFormData({
      batch: record.batch,
      sgpaFrom: record.sgpaFrom,
      sgpaTo: record.sgpaTo,
      class: record.class
    });
    
    // Set edit mode
    setIsEditMode(true);
    setSelectedRecordId(record.id);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      batch: '',
      sgpaFrom: '',
      sgpaTo: '',
      class: ''
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
      const response = await deleteClassGrade(id);

      if (response.success) {
        alert('Record deleted successfully!');
        console.log('Class grade deleted:', response);

        // Refresh grid data
        fetchGridData();
      } else {
        alert('Failed to delete record: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting class grade:', error);
      alert('Error deleting record: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Class Grade Master
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

              <div className={styles.formRow}>
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
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Class</label>
                  <input
                    type="text"
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Class"
                    onKeyPress={(e) => {
                      if (!/[A-Za-z]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button 
                  onClick={handleSave} 
                  className={styles.saveBtn}
                  disabled={saveLoading}
                >
                  {saveLoading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
                </button>
                <button onClick={handleCancel} className={styles.cancelBtn}>Cancel</button>
                <button 
                  onClick={() => {
                    console.log('Copy icon button clicked - opening modal');
                    setShowCopyModal(true);
                  }} 
                  className={styles.copyBtn}
                  title="Copy Class Grades Data From Previous Batch"
                >
                  <FaCopy />
                </button>
                <button className={styles.exportBtn} title="Export">
                  <FaFileExport /> Export
                </button>
              </div>
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
                  <th>Class</th>
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
                      className={selectedRecordId === item.id ? styles.selectedRow : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.centerText}>{item.batch}</td>
                      <td className={styles.centerText}>{item.course}</td>
                      <td className={styles.centerText}>{item.sgpaFrom}</td>
                      <td className={styles.centerText}>{item.sgpaTo}</td>
                      <td className={styles.centerText}>
                        <span className={styles.classLink}>{item.class}</span>
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
              <span>Copy Class Grades Data From Previous Batch</span>
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

export default ClassGrade; 