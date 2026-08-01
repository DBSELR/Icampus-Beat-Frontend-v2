import React, { useState } from 'react';
import { FaUser, FaChevronUp, FaUpload } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './ImportData.module.css';

const ImportData = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form state
  const [selectedDataType, setSelectedDataType] = useState('studentData');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file selected');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Data type options
  const dataTypes = [
    { id: 'studentData', label: 'Student Data' },
    { id: 'electiveData', label: 'Elective Data' },
    { id: 'examSessionDates', label: 'Exam Session and Dates Data' },
    { id: 'condonationFee', label: 'Condonation Fee' },
    { id: 'examRegistrationBlocking', label: 'Exam Registration Blocking' },
    { id: 'hallTicketsBlocking', label: 'HallTickets Blocking' },
    { id: 'resultBlocking', label: 'Result Blocking' },
    { id: 'internalMarks', label: 'Internal Marks' },
    { id: 'rvRcMarks', label: 'RV/RC Marks' },
    { id: 'auditCourseData', label: 'Audit Course Data' }
  ];

  // Sheet options (simulated)
  const sheetOptions = ['Sheet1', 'Sheet2', 'Sheet3'];

  // Handle radio button change
  const handleDataTypeChange = (dataType) => {
    setSelectedDataType(dataType);
    setShowImportOptions(false);
    setUploadMessage('');
    setErrorMessage('');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadMessage('');
      setErrorMessage('');
    } else {
      setSelectedFile(null);
      setFileName('No file selected');
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first');
      return;
    }

    // Check file extension
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      setErrorMessage('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setUploadMessage('File uploaded successfully! Please select a sheet to import.');
    setShowImportOptions(true);
    setErrorMessage('');
  };

  // Handle import
  const handleImport = () => {
    if (!selectedSheet) {
      setErrorMessage('Please select a sheet to import');
      return;
    }

    // Simulate import process
    setUploadMessage(`Importing ${selectedDataType} from ${selectedSheet}...`);
    
    setTimeout(() => {
      setUploadMessage('Data imported successfully!');
      setShowImportOptions(false);
      setSelectedFile(null);
      setFileName('No file selected');
      setSelectedSheet('');
    }, 2000);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null);
    setFileName('No file selected');
    setShowImportOptions(false);
    setUploadMessage('');
    setErrorMessage('');
    setSelectedSheet('');
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Excel File Importing
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
            {/* Radio Buttons - First Row */}
            <div className={styles.radioRow}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="studentData"
                  checked={selectedDataType === 'studentData'}
                  onChange={() => handleDataTypeChange('studentData')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Student Data</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="electiveData"
                  checked={selectedDataType === 'electiveData'}
                  onChange={() => handleDataTypeChange('electiveData')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Elective Data</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="examSessionDates"
                  checked={selectedDataType === 'examSessionDates'}
                  onChange={() => handleDataTypeChange('examSessionDates')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Exam Session and Dates Data</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="condonationFee"
                  checked={selectedDataType === 'condonationFee'}
                  onChange={() => handleDataTypeChange('condonationFee')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Condonation Fee</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="examRegistrationBlocking"
                  checked={selectedDataType === 'examRegistrationBlocking'}
                  onChange={() => handleDataTypeChange('examRegistrationBlocking')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Exam Registration Blocking</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="hallTicketsBlocking"
                  checked={selectedDataType === 'hallTicketsBlocking'}
                  onChange={() => handleDataTypeChange('hallTicketsBlocking')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>HallTickets Blocking</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="resultBlocking"
                  checked={selectedDataType === 'resultBlocking'}
                  onChange={() => handleDataTypeChange('resultBlocking')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Result Blocking</span>
              </label>
            </div>

            {/* Radio Buttons - Second Row */}
            <div className={styles.radioRow}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="internalMarks"
                  checked={selectedDataType === 'internalMarks'}
                  onChange={() => handleDataTypeChange('internalMarks')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Internal Marks</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="rvRcMarks"
                  checked={selectedDataType === 'rvRcMarks'}
                  onChange={() => handleDataTypeChange('rvRcMarks')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>RV/RC Marks</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="dataType"
                  value="auditCourseData"
                  checked={selectedDataType === 'auditCourseData'}
                  onChange={() => handleDataTypeChange('auditCourseData')}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>Audit Course Data</span>
              </label>
            </div>

            {/* File Upload Section */}
            <div className={styles.fileUploadSection}>
              <div className={styles.fileInputContainer}>
                <input
                  type="file"
                  id="fileInput"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <label htmlFor="fileInput" className={styles.fileInputLabel}>
                  Choose File
                </label>
                <span className={styles.fileName}>{fileName}</span>
              </div>
              
              <button onClick={handleUpload} className={styles.uploadBtn}>
                <FaUpload className={styles.uploadIcon} />
                Upload
              </button>
            </div>

            {/* Messages */}
            {uploadMessage && (
              <div className={styles.successMessage}>
                {uploadMessage}
              </div>
            )}

            {errorMessage && (
              <div className={styles.errorMessage}>
                {errorMessage}
              </div>
            )}

            {/* Import Options */}
            {showImportOptions && (
              <div className={styles.importOptions}>
                <div className={styles.sheetSelection}>
                  <label className={styles.sheetLabel}>Select Sheet:</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className={styles.sheetDropdown}
                  >
                    <option value="">Select a sheet...</option>
                    {sheetOptions.map(sheet => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.importButtons}>
                  <button onClick={handleImport} className={styles.importBtn}>
                    Import
                  </button>
                  <button onClick={handleCancel} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData; 