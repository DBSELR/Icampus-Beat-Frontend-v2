import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import {
  getCondonationSems,
  getCondonationStudent,
  getCondonationGrid,
  checkCondonationDates,
  saveCondonation,
  deleteCondonation,
  getCondonationFormat,
  exportCondonation,
  getAppData
} from '../utils/api';
import styles from './CondonationFee.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const CondonationFee = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    registrationNo: '',
    sem: '',
    batch: '',
    branch: '',
    name: '',
    condonationAmount: ''
  });

  // Dropdown options
  const [semOptions, setSemOptions] = useState([]);

  // Table data state
  const [tableData, setTableData] = useState([]);
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get app data from localStorage
  const appData = getAppData();
  const course = appData?.course || '';
  const examMy = appData?.examMY || '';
  const regulation = appData?.regulation || '';

  // Helper to get regsup string from value (if needed)
  const getRegsupString = (value) => {
    switch (value) {
      case '1': return 'REG';
      case '2': return 'SUP';
      case '3': return 'REG&SUP';
      default: return 'REG';
    }
  };

  // Load semesters when registrationNo changes
  useEffect(() => {
    if (formData.registrationNo && course && regulation && examMy) {
      loadSems();
    } else {
      setSemOptions([]);
      setFormData(prev => ({ ...prev, sem: '' }));
    }
  }, [formData.registrationNo, course, regulation, examMy]);

  const loadSems = async () => {
    if (!formData.registrationNo || !course || !regulation || !examMy) return;
    
    try {
      setIsLoading(true);
      // Using REG as default regsup, can be changed if needed
      const regsup = 'REG';
      const response = await getCondonationSems(course, regulation, examMy, regsup, formData.registrationNo);
      
      console.log('Condonation Sems API Response:', response);
      
      if (response.success && response.data) {
        // Handle both array and single object
        const dataArray = Array.isArray(response.data) ? response.data : [response.data];
        const sems = dataArray.map(item => {
          const sem = item.Sem || item.sem || item.SEM || item.SemNo || item.Semester || '';
          return sem ? String(sem) : '';
        }).filter(s => s);
        console.log('Extracted semesters:', sems);
        setSemOptions(sems);
      } else {
        console.warn('No semesters found in response:', response);
        setSemOptions([]);
      }
    } catch (err) {
      console.error('Error loading semesters:', err);
      setSemOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load student data when registrationNo changes (with debounce)
  useEffect(() => {
    if (!formData.registrationNo) {
      // Clear form when regno is empty
      setFormData(prev => ({
        ...prev,
        batch: '',
        branch: '',
        name: '',
        sem: '',
        condonationAmount: ''
      }));
      setSemOptions([]);
      setTableData([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      loadStudentData();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData.registrationNo]);

  const loadStudentData = async () => {
    if (!formData.registrationNo) return;
    
    try {
      setIsLoading(true);
      setError('');
      const response = await getCondonationStudent(formData.registrationNo);
      
      console.log('Condonation Student API Response:', response);
      
      if (response.success && response.data) {
        // Handle both array and single object
        const student = Array.isArray(response.data) ? response.data[0] : response.data;
        console.log('Student data object:', student);
        
        setFormData(prev => ({
          ...prev,
          batch: student.Regu || student.regu || student.REGU || student.Batch || student.batch || student.Regulation || '',
          branch: student.GRP || student.grp || student.Grp || student.Branch || student.branch || student.BRANCH || student.Group || student.group || '',
          name: student.SName || student.sname || student.SNAME || student.Name || student.name || student.NAME || ''
        }));
        
        console.log('Updated form data with:', {
          batch: student.Regu || student.regu || student.REGU || student.Batch || student.batch || '',
          branch: student.GRP || student.grp || student.Grp || student.Branch || student.branch || student.BRANCH || '',
          name: student.SName || student.sname || student.SNAME || student.Name || student.name || student.NAME || ''
        });
      } else {
        console.warn('No student data found in response:', response);
        // Clear student fields if not found
        setFormData(prev => ({
          ...prev,
          batch: '',
          branch: '',
          name: ''
        }));
      }
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message || 'Failed to load student data');
      setFormData(prev => ({
        ...prev,
        batch: '',
        branch: '',
        name: ''
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Load grid data when regno, examMy, course, sem are available
  useEffect(() => {
    if (formData.registrationNo && examMy && course && formData.sem) {
      loadGridData();
    } else {
      setTableData([]);
    }
  }, [formData.registrationNo, examMy, course, formData.sem]);

  const loadGridData = async () => {
    if (!formData.registrationNo || !examMy || !course || !formData.sem) return;
    
    try {
      setIsLoading(true);
      setError('');
      const response = await getCondonationGrid(
        formData.registrationNo,
        examMy,
        course,
        formData.sem
      );
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setTableData(response.data);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error('Error loading grid data:', err);
      setError(err.message || 'Failed to load grid data');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If sem changes, reload grid
    if (name === 'sem') {
      // Grid will reload via useEffect
    }
  };

  // Handle save button
  const handleSave = async () => {
    if (!formData.registrationNo || !formData.sem || !formData.condonationAmount) {
      alert('Please fill all required fields (Registration No, Sem, Condonation Amount)');
      return;
    }

    if (!course || !examMy || !regulation) {
      alert('Please select Course, Regulation, and Exam M/Y from header dropdowns');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const payload = {
        regno: formData.registrationNo,
        sem: String(formData.sem),
        examMy: examMy,
        condonationAmount: parseFloat(formData.condonationAmount) || 0,
        regulation: regulation,
        regu: formData.batch || 'REG'
      };

      const response = await saveCondonation(payload);
      
      if (response.success) {
        alert(response.message || 'Condonation saved successfully!');
        // Clear form
        setFormData(prev => ({
          ...prev,
          condonationAmount: ''
        }));
        // Reload grid
        await loadGridData();
      } else {
        alert(response.message || 'Failed to save condonation');
      }
    } catch (err) {
      console.error('Error saving condonation:', err);
      alert(err.message || 'Failed to save condonation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    setFormData({
      registrationNo: '',
      sem: '',
      batch: '',
      branch: '',
      name: '',
      condonationAmount: ''
    });
    setTableData([]);
    setSemOptions([]);
    setError('');
  };

  // Handle excel format export
  const handleExcelFormat = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await getCondonationFormat();
      
      console.log('Format API Response:', response);
      
      if (response.success && response.data) {
        // Format endpoint returns JSON data with sample row structure
        // Convert to CSV/Excel format for download
        const formatData = response.data;
        
        // Create CSV content from the format data
        const headers = ['Regulation', 'Regu', 'Sem', 'Exammy', 'Regno', 'CondonationAmount'];
        const values = [
          formatData.Regulation || '',
          formatData.Regu || '',
          formatData.Sem || '',
          formatData.Exammy || '',
          formatData.Regno || '',
          formatData.CondonationAmount || ''
        ];
        
        const csvContent = [
          headers.join(','),
          values.join(',')
        ].join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CondonationFormat.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert(response.message || 'Failed to fetch format');
      }
    } catch (err) {
      console.error('Error exporting format:', err);
      alert(err.message || 'Failed to export format. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle condonation list export
  const handleCondonationList = async () => {
    if (!examMy || !regulation) {
      alert('Please select Exam M/Y and Regulation from header dropdowns');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Export endpoint returns JSON data, not blob
      const response = await exportCondonation(examMy, regulation);
      
      console.log('Export API Response:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        // Convert JSON array to CSV
        const data = response.data;
        
        if (data.length === 0) {
          alert('No data to export');
          return;
        }
        
        // Get headers from first row
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        // Add data rows
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CondonationList_${examMy}_${regulation}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert(response.message || 'No data to export');
      }
    } catch (err) {
      console.error('Error exporting condonation list:', err);
      alert(err.message || 'Failed to export condonation list. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete row
  const handleDelete = async (id, regno) => {
    if (!window.confirm('Do you want to delete this record?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await deleteCondonation(id, regno);
      
      if (response.success) {
        alert(response.message || 'Record deleted successfully!');
        // Reload grid
        await loadGridData();
      } else {
        alert(response.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting record:', err);
      alert(err.message || 'Failed to delete record. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle row click (for edit)
  const handleRowClick = (row) => {
    setFormData({
      registrationNo: row.regno || row.Regno || row.REGNO || '',
      sem: String(row.Sem || row.sem || row.SEM || ''),
      batch: row.Regu || row.regu || row.REGU || '',
      branch: row.Branch || row.branch || row.BRANCH || '',
      name: row.Name || row.name || row.NAME || '',
      condonationAmount: String(row.CondonationAmount || row.condonationAmount || row.CONDONATIONAMOUNT || '')
    });
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Condonation Fee</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            CONDONATION FEE
          </h2>
          <button
            className={`${styles.collapseBtn} ${isMainCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsMainCollapsed(!isMainCollapsed)}
            aria-label="Toggle Form Section"
          >
            {isMainCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>

        {!isMainCollapsed && (
          <div className={styles.cardBody}>
            {(!course || !examMy || !regulation) && (
              <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                Please select Regulation, Course and Exam M/Y from the header dropdowns
              </div>
            )}

            {error && (
              <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {isLoading && (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                Loading...
              </div>
            )}

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              {/* Form Panel */}
              <div className={styles.formPanel}>
                <table className={styles.formTable}>
                  <tbody>
                    {/* Row 1: RegistrationNO. and Sem */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>RegistrationNO.</label>
                          <input
                            type="text"
                            name="registrationNo"
                            className={styles.input}
                            value={formData.registrationNo}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Sem</label>
                          <select
                            name="sem"
                            className={styles.select}
                            value={formData.sem}
                            onChange={handleInputChange}
                            disabled={!formData.registrationNo || semOptions.length === 0 || isLoading}
                          >
                            <option value="">Select Sem</option>
                            {semOptions.map((sem, idx) => (
                              <option key={idx} value={sem}>{sem}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: Batch and Branch */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Batch</label>
                          <input
                            type="text"
                            name="batch"
                            className={styles.input}
                            value={formData.batch}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Branch</label>
                          <input
                            type="text"
                            name="branch"
                            className={styles.input}
                            value={formData.branch}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: Name and Condonation Amount */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Name</label>
                          <input
                            type="text"
                            name="name"
                            className={styles.input}
                            value={formData.name}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Condonation Amount</label>
                          <input
                            type="number"
                            name="condonationAmount"
                            className={styles.input}
                            value={formData.condonationAmount}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Action Buttons */}
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.excelFormatBtn}
                    onClick={handleExcelFormat}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Exporting...' : 'Excel Format'}
                  </button>
                  <button
                    type="button"
                    className={styles.condonationListBtn}
                    onClick={handleCondonationList}
                    disabled={isLoading || !examMy || !regulation}
                  >
                    {isLoading ? 'Exporting...' : 'Condination List'}
                  </button>
                </div>
              </div>
            </form>

            {/* Bottom Panel with Table */}
            <div className={styles.bottomPanel}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Regulation</th>
                    <th>Exammy</th>
                    <th>REGU</th>
                    <th>RegistrationNo</th>
                    <th>Sem</th>
                    <th>CondonationAmount</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className={styles.emptyTable}>
                        {formData.registrationNo && formData.sem ? 'No data available' : 'Select Registration No and Sem to view data'}
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, index) => (
                      <tr 
                        key={row.ID || row.id || index} 
                        onClick={() => handleRowClick(row)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{row.Regulation || row.regulation || ''}</td>
                        <td>{row.Exammy || row.exammy || row.ExamMy || row.examMy || ''}</td>
                        <td>{row.Regu || row.regu || row.REGU || ''}</td>
                        <td>{row.regno || row.Regno || row.REGNO || ''}</td>
                        <td>{row.Sem || row.sem || row.SEM || ''}</td>
                        <td>{row.CondonationAmount || row.condonationAmount || row.CONDONATIONAMOUNT || ''}</td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(row.ID || row.id, row.regno || row.Regno || row.REGNO);
                            }}
                            title="Delete"
                            disabled={isLoading}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CondonationFee;
