import React, { useState, useEffect, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import { getCancelReceiptStudent, getCancelReceiptSubjects, cancelReceiptPost, cancelReceiptDelete, getAppData } from '../utils/api';
import styles from './ReceiptCancel.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ReceiptCancel = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [htNo, setHtNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [tableData, setTableData] = useState([]);
  const [studentData, setStudentData] = useState(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [error, setError] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    receiptNo: '',
    regNo: '',
    index: -1
  });

  // Load receipt subjects
  const loadReceiptSubjects = async (regno, examMy = '') => {
    if (!regno || regno.trim() === '') return;

    try {
      setIsLoading(true);
      setError('');
      
      // Get examMy from header if not provided
      if (!examMy || examMy.trim() === '') {
        const appData = getAppData();
        examMy = appData?.examMY || appData?.examMy || '';
        console.log('ReceiptCancel: examMy not provided, using from header:', examMy);
      }
      
      console.log('ReceiptCancel: Calling getCancelReceiptSubjects API with regno:', regno.trim().toUpperCase(), 'examMy:', examMy);
      
      const response = await getCancelReceiptSubjects(regno.trim().toUpperCase(), examMy);


      // Handle response - check for data even if success is false (empty array is valid)
      // API returns: { success: true, message: "...", data: [...] }
      if (response && response.data !== undefined && response.data !== null) {
        // Check if data is an array
        if (Array.isArray(response.data)) {
          if (response.data.length > 0) {
          console.log('ReceiptCancel: Receipts loaded successfully:', response.data.length, 'items');
            // Map API response to table format - handle all field name variations
            // Based on actual API response: RECEIPTNO, PDATE, EXAMMY, COURSE, REGNO, SEM, REGSUP, PCOUNT, APPFEE, EXAMFEE, FINEFEE, CONCESSION, USERID, PAPERS
          const mappedData = response.data.map((receipt, idx) => ({
            id: idx,
              receiptNo: receipt.RECEIPTNO || receipt.ReceiptNo || receipt.receiptNo || receipt.ReceiptNO || '',
              pdate: receipt.PDATE || receipt.PDate || receipt.pdate || '',
              exammy: receipt.EXAMMY || receipt.ExamMy || receipt.examMy || receipt.ExamMY || receipt.exammy || '',
            course: receipt.COURSE || receipt.Course || receipt.course || '',
              regNo: receipt.REGNO || receipt.RegNo || receipt.regNo || receipt.REGNO || '',
            sem: receipt.SEM || receipt.Sem || receipt.sem || '',
              regsup: receipt.REGSUP || receipt.RegSup || receipt.regSup || receipt.RegSup || '',
              pcount: receipt.PCOUNT || receipt.PCount || receipt.pCount || receipt.Pcount || '',
              appFee: receipt.APPFEE || receipt.AppFee || receipt.appFee || receipt.AppFEE || 0,
              examFee: receipt.EXAMFEE || receipt.ExamFee || receipt.examFee || receipt.ExamFEE || 0,
              fineFee: receipt.FINEFEE || receipt.FineFee || receipt.fineFee || receipt.FineFEE || receipt.finefee || 0,
              concession: receipt.CONCESSION || receipt.Concession || receipt.concession || 0,
              userId: receipt.USERID || receipt.UserId || receipt.userId || receipt.USERID || '',
            papers: receipt.PAPERS || receipt.Papers || receipt.papers || ''
          }));
            console.log('ReceiptCancel: Mapped data:', mappedData);
          setTableData(mappedData);
            setError(''); // Clear any previous errors
          } else {
            console.log('ReceiptCancel: Empty array - no receipts found');
            setTableData([]);
            setError(response.message || 'No receipts found for this registration number');
          }
        } else {
          // Data is not an array - might be a single object, wrap it in array
          console.log('ReceiptCancel: Data is not an array, wrapping in array');
          const mappedData = [{
            id: 0,
            receiptNo: response.data.RECEIPTNO || response.data.ReceiptNo || response.data.receiptNo || '',
            pdate: response.data.PDATE || response.data.PDate || response.data.pdate || '',
            exammy: response.data.EXAMMY || response.data.ExamMy || response.data.examMy || response.data.ExamMY || response.data.exammy || '',
            course: response.data.COURSE || response.data.Course || response.data.course || '',
            regNo: response.data.REGNO || response.data.RegNo || response.data.regNo || '',
            sem: response.data.SEM || response.data.Sem || response.data.sem || '',
            regsup: response.data.REGSUP || response.data.RegSup || response.data.regSup || '',
            pcount: response.data.PCOUNT || response.data.PCount || response.data.pCount || '',
            appFee: response.data.APPFEE || response.data.AppFee || response.data.appFee || 0,
            examFee: response.data.EXAMFEE || response.data.ExamFee || response.data.examFee || 0,
            fineFee: response.data.FINEFEE || response.data.FineFee || response.data.fineFee || 0,
            concession: response.data.CONCESSION || response.data.Concession || response.data.concession || 0,
            userId: response.data.USERID || response.data.UserId || response.data.userId || '',
            papers: response.data.PAPERS || response.data.Papers || response.data.papers || ''
          }];
          setTableData(mappedData);
          setError('');
        }
      } else {
        console.log('ReceiptCancel: No data in response');
        setTableData([]);
        setError(response?.message || 'No receipts found for this registration number');
      }
    } catch (err) {
      console.error('ReceiptCancel: Error loading receipt subjects:', err);
      setError(err.message || 'Failed to load receipt subjects');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load student data
  const loadStudentData = async (regno) => {
    const regNoToUse = regno || htNo;
    if (!regNoToUse || regNoToUse.trim() === '') return;

    try {
      setIsLoadingStudent(true);
      setError('');
      console.log('ReceiptCancel: Calling getCancelReceiptStudent API with regno:', regNoToUse.trim().toUpperCase());
      
      const response = await getCancelReceiptStudent(regNoToUse.trim().toUpperCase());
      console.log('ReceiptCancel: Student API response:', response);

      if (response && response.data) {
        const student = Array.isArray(response.data) ? response.data[0] : response.data;
        console.log('ReceiptCancel: Student data:', student);
        setStudentData(student);
        // API returns SNAME (all caps)
        setStudentName(student.SNAME || student.SName || student.sname || student.Name || student.name || student.NAME || '');
        
        // Get examMy from student data, or from appData (header selection), or try empty
        const studentExamMy = student.ExamMy || student.examMy || student.EXAMMY || '';
        const appData = getAppData();
        const headerExamMy = appData?.examMY || appData?.examMy || '';
        const examMy = studentExamMy || headerExamMy || '';
        
        console.log('ReceiptCancel: Using examMy:', examMy, '(from student:', studentExamMy, ', from header:', headerExamMy, ')');
        
        // Always try to load receipts, even if examMy is empty (API might handle it)
        await loadReceiptSubjects(regNoToUse, examMy);
      } else {
        console.log('ReceiptCancel: Student not found or no data');
        setStudentData(null);
        setStudentName('');
        setTableData([]);
        setError(response?.message || 'Student not found');
      }
    } catch (err) {
      console.error('ReceiptCancel: Error loading student data:', err);
      setError(err.message || 'Failed to load student data');
      setStudentData(null);
      setStudentName('');
      setTableData([]);
    } finally {
      setIsLoadingStudent(false);
    }
  };

  // Auto-load disabled - user will click Find button manually
  // useEffect removed to prevent automatic API calls

  // Handle H.T.No. change
  const handleHtNoChange = (e) => {
    const value = e.target.value.toUpperCase();
    setHtNo(value);

    // Clear data when regno is cleared
    if (value.trim() === '') {
      setStudentName('');
      setTableData([]);
      setError('');
    }
  };

  // Handle Find button click (manual trigger)
  const handleFindClick = async () => {
    if (!htNo || htNo.trim() === '') {
      alert('Please enter H.T.No.');
      return;
    }
    
    console.log('ReceiptCancel: ========== Find button clicked ==========');
    console.log('ReceiptCancel: H.T.No. value:', htNo);
    console.log('ReceiptCancel: Calling loadStudentData...');
    
    try {
      await loadStudentData(htNo);
      console.log('ReceiptCancel: loadStudentData completed');
    } catch (err) {
      console.error('ReceiptCancel: Error in handleFindClick:', err);
      alert('Error loading data: ' + err.message);
    }
  };

  // Handle key down - allow Enter key to trigger search
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFindClick();
    }
  };

  // Handle delete button click
  const handleDeleteClick = (receiptNo, regNo, index) => {
    setDeleteConfirm({
      show: true,
      receiptNo: receiptNo,
      regNo: regNo || htNo,
      index: index
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.receiptNo) return;

    try {
      setIsLoading(true);
      setError('');
      
      const appData = getAppData();
      const userId = appData?.userId || localStorage.getItem('userId') || '';

      console.log('ReceiptCancel: Canceling receipt:', {
        receiptNo: deleteConfirm.receiptNo,
        regNo: deleteConfirm.regNo,
        userId: userId
      });

      // Use POST method for cancel (as per API documentation)
      const response = await cancelReceiptPost(
        deleteConfirm.receiptNo,
        deleteConfirm.regNo,
        userId
      );

      console.log('ReceiptCancel: Cancel API response:', response);

      if (response && response.success) {
        // Reload receipt list after successful cancellation
        setDeleteConfirm({ show: false, receiptNo: '', regNo: '', index: -1 });
        alert('Receipt canceled successfully');
        
        // Reload the receipt list to reflect the changes
        const appData = getAppData();
        const examMy = appData?.examMY || appData?.examMy || '';
        await loadReceiptSubjects(deleteConfirm.regNo || htNo, examMy);
      } else {
        throw new Error(response?.message || 'Failed to cancel receipt');
      }
    } catch (err) {
      console.error('ReceiptCancel: Error canceling receipt:', err);
      setError(err.message || 'Failed to cancel receipt');
      alert(err.message || 'Failed to cancel receipt');
    } finally {
      setIsLoading(false);
      setDeleteConfirm({ show: false, receiptNo: '', regNo: '', index: -1 });
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, receiptNo: '', regNo: '', index: -1 });
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cancel Receipt</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaTrash className={styles.headerIcon} style={{ color: themeColor }} />
            CANCEL RECEIPT
          </h2>
        </div>
        
        <div className={styles.cardBody}>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <table className={styles.mainTable}>
              <tbody>
                <tr>
                  <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <label className={styles.htNoLabel} style={{ margin: 0 }}>
                        H.T.No.<span className={styles.spacer}></span>:<span className={styles.spacer}></span>
                      </label>
                      <input
                        type="text"
                        className={styles.htNoInput}
                        value={htNo}
                        onChange={handleHtNoChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter H.T.No."
                        readOnly={false}
                        disabled={isLoadingStudent || isLoading}
                        style={{ marginLeft: 0 }}
                      />
                      <button
                        type="button"
                        onClick={handleFindClick}
                        className={styles.findButton}
                        disabled={isLoadingStudent || isLoading || !htNo || htNo.trim() === ''}
                        style={{
                          backgroundColor: (!htNo || htNo.trim() === '' || isLoadingStudent || isLoading) ? '#ccc' : '#3f9fd9',
                          cursor: (!htNo || htNo.trim() === '' || isLoadingStudent || isLoading) ? 'not-allowed' : 'pointer',
                          marginLeft: 0,
                          display: 'inline-block',
                          visibility: 'visible',
                          opacity: (!htNo || htNo.trim() === '' || isLoadingStudent || isLoading) ? 0.6 : 1
                        }}
                      >
                        {isLoadingStudent || isLoading ? 'Loading...' : 'Find'}
                      </button>
                      {studentName && (
                        <label className={styles.studentNameLabel} style={{ margin: 0 }}>
                          {studentName}
                        </label>
                      )}
                      {isLoadingStudent && <span className={styles.loadingText}>Loading...</span>}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <br />
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>RECEIPTNO</th>
                            <th>PDATE</th>
                            <th>EXAMMY</th>
                            <th>COURSE</th>
                            <th>REG.NO.</th>
                            <th>SEM</th>
                            <th>REGSUP</th>
                            <th>PCOUNT</th>
                            <th>APPFEE</th>
                            <th>EXAMFEE</th>
                            <th>FINEFEE</th>
                            <th>CONCESSION</th>
                            <th>USERID</th>
                            <th>PAPERS</th>
                            <th>Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading && tableData.length === 0 ? (
                            <tr>
                              <td colSpan="15" className={styles.emptyTable}>
                                Loading receipts...
                              </td>
                            </tr>
                          ) : tableData.length === 0 ? (
                            <tr>
                              <td colSpan="15" className={styles.emptyTable}>
                                {htNo ? 'No receipts found for this registration number' : 'Enter H.T.No. to view receipts'}
                              </td>
                            </tr>
                          ) : (
                            tableData.map((row, index) => {
                              console.log('ReceiptCancel: Rendering row:', index, row);
                              // Format PDATE if it exists
                              const formatDate = (dateStr) => {
                                if (!dateStr) return '-';
                                try {
                                  const date = new Date(dateStr);
                                  if (isNaN(date.getTime())) return dateStr;
                                  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                } catch {
                                  return dateStr;
                                }
                              };
                              
                              return (
                              <tr key={row.id || index}>
                                  <td className={styles.redText}>{row.receiptNo || '-'}</td>
                                  <td>{formatDate(row.pdate)}</td>
                                  <td>{row.exammy || '-'}</td>
                                  <td>{row.course || '-'}</td>
                                  <td className={styles.redText}>{row.regNo || '-'}</td>
                                  <td>{row.sem || '-'}</td>
                                  <td>{row.regsup || '-'}</td>
                                  <td>{row.pcount || '-'}</td>
                                  <td>{row.appFee !== undefined && row.appFee !== null ? parseFloat(row.appFee).toFixed(2) : '0.00'}</td>
                                  <td>{row.examFee !== undefined && row.examFee !== null ? parseFloat(row.examFee).toFixed(2) : '0.00'}</td>
                                  <td>{row.fineFee !== undefined && row.fineFee !== null ? parseFloat(row.fineFee).toFixed(2) : '0.00'}</td>
                                  <td>{row.concession !== undefined && row.concession !== null ? parseFloat(row.concession).toFixed(2) : '0.00'}</td>
                                  <td>{row.userId || '-'}</td>
                                  <td className={styles.papersCell} title={row.papers || ''}>
                                    {row.papers || '-'}
                                </td>
                                <td>
                                  <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteClick(row.receiptNo, row.regNo, index)}
                                    disabled={isLoading}
                                    title="Delete"
                                  >
                                    <FaTrash style={{ color: 'red' }} />
                                  </button>
                                </td>
                              </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Confirmation</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Do you want to delete this record?</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalButtonYes}
                onClick={handleDeleteConfirm}
                disabled={isLoading}
              >
                Yes
              </button>
              <button
                className={styles.modalButtonNo}
                onClick={handleDeleteCancel}
                disabled={isLoading}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptCancel;


