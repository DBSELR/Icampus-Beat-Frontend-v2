import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp, FaTrash } from 'react-icons/fa';
import { saveFeeHeads, getFeeHeadsData, deleteFeeHeads, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './FeeHeads.module.css';

const FeeHeads = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    feeType: '',
    feeName: '',
    shortName: '',
    universityFee: '',
    collegeFee: ''
  });

  // Table data state
  const [tableData, setTableData] = useState([]);
  
  // Data loading state
  const [dataLoading, setDataLoading] = useState(false);

  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // Modal state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Fetch fee heads data from API
  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Get course from localStorage
      const appData = getAppData();
      const course = appData?.course;

      if (!course) {
        console.log('Course not found in localStorage');
        setTableData([]);
        setDataLoading(false);
        return;
      }

      const response = await getFeeHeadsData(course);

      if (response.success && response.data) {
        // Map API response to table data format
        const mappedData = response.data.map((item, index) => {
          return {
            id: item.ID || index + 1,
            feeType: item.FEETYPE || item.feeType || '',
            feeName: item.FEENAME || item.feeName,
            shortName: item.SHORTNAME || item.shortName || '',
            universityFee: (item.JNTUAMOUNT || item.universityFee || 0).toFixed(2),
            collegeFee: (item.LBRAMOUNT || item.collegeFee || 0).toFixed(2)
          };
        });

        setTableData(mappedData);
        console.log('Fee heads data loaded:', mappedData);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching fee heads data:', error);
      setTableData([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.feeType || !formData.feeName || !formData.shortName || 
        formData.universityFee === '' || formData.collegeFee === '') {
      alert('Please enter all the fields.');
      return;
    }

    // Check for duplicate fee name (only for new records, skip for updates)
    if (!isEditMode) {
      const existingFee = tableData.find(item => 
        item.feeName.toLowerCase() === formData.feeName.toLowerCase()
      );

      if (existingFee) {
        alert('Fee name already exists');
        return;
      }
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
      const feeHeadsData = {
        ID: isEditMode ? selectedRecordId : 0, // Use existing ID for updates, 0 for new records
        COURSE: course,
        FEETYPE: formData.feeType,
        FEENAME: formData.feeName,
        SHORTNAME: formData.shortName,
        JNTUAMOUNT: parseFloat(formData.universityFee),
        LBRAMOUNT: parseFloat(formData.collegeFee)
      };

      const response = await saveFeeHeads(feeHeadsData);

      if (response.success) {
        const message = isEditMode ? 'Fee updated successfully!' : 'Fee saved successfully!';
        alert(message);
        console.log('Fee heads saved:', response);

        // Reset form
        setFormData({
          feeType: '',
          feeName: '',
          shortName: '',
          universityFee: '',
          collegeFee: ''
        });

        // Reset edit mode
        setIsEditMode(false);
        setSelectedRecordId(null);

        // Refresh data from API
        fetchData();
      } else {
        alert('Failed to save fee: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving fee heads:', error);
      alert('Error saving fee: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle row click to edit
  const handleRowClick = (record) => {
    // Populate form with record data
    setFormData({
      feeType: record.feeType || '',
      feeName: record.feeName,
      shortName: record.shortName || '',
      universityFee: record.universityFee,
      collegeFee: record.collegeFee
    });
    
    // Set edit mode
    setIsEditMode(true);
    setSelectedRecordId(record.id);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      feeType: '',
      feeName: '',
      shortName: '',
      universityFee: '',
      collegeFee: ''
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
      const response = await deleteFeeHeads(id);

      if (response.success) {
        alert('Record deleted successfully!');
        console.log('Fee heads deleted:', response);

        // If we're deleting the currently selected record, reset edit mode
        if (selectedRecordId === id) {
          setFormData({
            feeType: '',
            feeName: '',
            shortName: '',
            universityFee: '',
            collegeFee: ''
          });
          setIsEditMode(false);
          setSelectedRecordId(null);
        }

        // Refresh data from API
        fetchData();
      } else {
        alert('Failed to delete record: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting fee heads:', error);
      alert('Error deleting record: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle backup modal
  const handleBackup = () => {
    setShowBackupModal(true);
  };

  // Handle file selection for backup
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      setSelectedFile(null);
      setFileName('No file chosen');
    }
  };

  // Handle backup save
  const handleBackupSave = () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    // Simulate backup process
    alert('Database backup saved successfully!');
    setShowBackupModal(false);
    setSelectedFile(null);
    setFileName('No file chosen');
  };

  // Handle backup modal close
  const handleBackupClose = () => {
    setShowBackupModal(false);
    setSelectedFile(null);
    setFileName('No file chosen');
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaEdit className={styles.headerIcon} />
            Fee Heads Master
          </h2>
          <button 
            className={`${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>
        
        <div className={`${styles.boxContent} ${isFormCollapsed ? styles.collapsed : ''}`}>
          <div className={styles.formSection}>
            <div className={styles.formContainer}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Fee Type</label>
                  <input
                    type="text"
                    name="feeType"
                    value={formData.feeType}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={isEditMode}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Fee Name</label>
                  <input
                    type="text"
                    name="feeName"
                    value={formData.feeName}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={isEditMode}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Short Name</label>
                  <input
                    type="text"
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={isEditMode}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>University Fee</label>
                    <input
                      type="number"
                      name="universityFee"
                      value={formData.universityFee}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>College Fee</label>
                  <input
                    type="number"
                    name="collegeFee"
                    value={formData.collegeFee}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="0"
                    step="0.01"
                    min="0"
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
                <button onClick={handleBackup} className={styles.backupBtn}>BackUp</button>
              </div>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Fee Name</th>
                  <th>University Fee</th>
                  <th>College Fee</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan="4" className={styles.centerText}>
                      Loading...
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.centerText}>
                      No data available. Please select a course from header dropdown.
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
                      <td className={styles.feeNameCell}>
                        <span className={styles.feeNameLink}>{item.feeName}</span>
                      </td>
                      <td className={styles.centerText}>{item.universityFee}</td>
                      <td className={styles.centerText}>{item.collegeFee}</td>
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

      {/* Backup Modal */}
      {showBackupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Do you want to Save the Database?</span>
              <button onClick={handleBackupClose} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalContent}>
                <div className={styles.fileSection}>
                  <input
                    type="file"
                    id="backupFile"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                  />
                  <label htmlFor="backupFile" className={styles.fileInputLabel}>
                    Choose File
                  </label>
                  <span className={styles.fileName}>{fileName}</span>
                </div>
                <div className={styles.pathSection}>
                  <span className={styles.pathLabel}>Choose Path</span>
                  <button className={styles.noBtn}>NO</button>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={handleBackupSave} className={styles.okBtn}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeHeads; 