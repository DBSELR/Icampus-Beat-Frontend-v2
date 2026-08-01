import React, { useState } from 'react';
import { FaUser, FaChevronUp, FaEye, FaCalendar, FaTimes } from 'react-icons/fa';
import styles from './ReceiptList.module.css';
import { getReceiptList, searchReceiptByRegNo, getReceiptDetail, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ReceiptList = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form data state
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    regNo: ''
  });

  // Table data state
  const [tableData, setTableData] = useState([]);

  // Show table state
  const [showTable, setShowTable] = useState(false);

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Receipt details state
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Helper function to format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear table when registration number is cleared
    if (name === 'regNo' && value.trim() === '') {
      setTableData([]);
      setShowTable(false);
      setError('');
    }
  };

  // Handle registration number search
  const handleRegNoSearch = async () => {
    if (!formData.regNo || formData.regNo.trim() === '') {
      alert('Please enter a Registration Number');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowTable(false);

    try {
      console.log('Searching receipt for regNo:', formData.regNo);
      const response = await searchReceiptByRegNo(formData.regNo.trim());
      console.log('Search Receipt Response:', response);

      if (response && response.data) {
        // Handle both single object and array responses
        const receiptData = Array.isArray(response.data) ? response.data : [response.data];
        if (receiptData.length > 0) {
          setTableData(receiptData);
        setShowTable(true);
      } else {
          setError(response.message || 'No receipt found for this registration number');
          setTableData([]);
        }
      } else {
        setError(response?.message || 'No receipt found for this registration number');
        setTableData([]);
      }
    } catch (err) {
      console.error('Error searching receipt:', err);
      setError(err.message || 'Failed to search receipt. Please try again.');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view button click
  const handleView = async () => {
    if (!formData.fromDate || !formData.toDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    // Get ExamMy and Course from localStorage
    const appData = getAppData();
    const examMy = appData?.examMY || '';
    const course = appData?.course || '';

    if (!examMy || !course) {
      alert('Please select Exam M/Y and Course from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowTable(false);

    try {
      // Format dates for API (DD-MM-YYYY) – backend expects DD-MM-YYYY in query too
      const fDate = formatDateForAPI(formData.fromDate);
      const tDate = formatDateForAPI(formData.toDate);

      // Get user from localStorage if available (optional for GET, still pass like old app)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.userId || user?.UserId || 'DBS';

      // Call GET API: /api/Receipt/list?ExamMy=...&Course=...&FDate=...&TDate=...&UserId=...
      const response = await getReceiptList(examMy, course, fDate, tDate, userId);

      // Handle response - check if data exists (even if success is false, data might be empty array)
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Map API response to table data format
        setTableData(response.data);
    setShowTable(true);
        setError(''); // Clear any previous errors
      } else {
        // No data found - show message but don't treat as error
        setError(response.message || 'No receipt data found for the selected criteria');
        setTableData([]);
        setShowTable(false);
      }
    } catch (err) {
      console.error('Error fetching receipt list:', err);
      setError(err.message || 'Failed to fetch receipt list. Please try again.');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle receipt number click
  const handleReceiptClick = async (receiptNo) => {
    console.log('Receipt clicked:', receiptNo);
    
    if (!receiptNo) {
      alert('Receipt number is missing');
      return;
    }

    // Get ExamMy and Course from localStorage
    const appData = getAppData();
    const examMy = appData?.examMY || '';
    const course = appData?.course || '';

    console.log('App data:', { examMy, course, appData });

    if (!examMy || !course) {
      alert('Please select Exam M/Y and Course from the header dropdowns');
      return;
    }

    setIsLoadingDetails(true);
    setDetailsError('');
    setShowReceiptModal(true);

    try {
      console.log('Fetching receipt details for:', { receiptNo, course, examMy });
      const response = await getReceiptDetail(receiptNo, course, examMy);
      console.log('Receipt detail response:', response);
      
      if (response && response.data) {
        setReceiptDetails(response.data);
        setDetailsError('');
      } else {
        setDetailsError(response?.message || 'No receipt details found');
        setReceiptDetails(null);
      }
    } catch (err) {
      console.error('Error fetching receipt details:', err);
      setDetailsError(err.message || 'Failed to fetch receipt details. Please try again.');
      setReceiptDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Close receipt details modal
  const handleCloseModal = () => {
    setShowReceiptModal(false);
    setReceiptDetails(null);
    setDetailsError('');
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Receipt List</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaUser className={styles.headerIcon} style={{ color: themeColor }} />
            RECEIPT LIST
          </h2>
          <button 
            className={`${styles.collapseBtn} ${isFormCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            aria-label="Toggle Form Section"
          >
            <FaChevronUp />
          </button>
        </div>
        
        <div className={styles.cardBody}>
          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            {/* Date Range Filter Section */}
            <div className={styles.filterSection}>
              <div className={styles.dateFilters}>
                <div className={styles.dateGroup}>
                  <label className={styles.dateLabel}>Fee Collection Date From:</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className={styles.dateInput}
                  />
                </div>

                <div className={styles.dateGroup}>
                  <label className={styles.dateLabel}>To Fee Collection Date To:</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className={styles.dateInput}
                  />
                </div>

                <button 
                  onClick={handleView} 
                  className={styles.viewBtn}
                  disabled={isLoading}
                >
                  <FaEye /> {isLoading ? 'Loading...' : 'View'}
                </button>
              </div>
            </div>

            {/* Registration Number Section */}
            <div className={styles.regNoSection}>
              <div className={styles.regNoGroup}>
                <label className={styles.regNoLabel}>RegesterNo:</label>
                <input
                  type="text"
                  name="regNo"
                  value={formData.regNo}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRegNoSearch();
                    }
                  }}
                  className={styles.regNoInput}
                  placeholder="Enter Registration Number"
                />
                <button 
                  onClick={handleRegNoSearch} 
                  className={styles.viewBtn}
                  disabled={isLoading}
                  style={{ marginLeft: '10px' }}
                >
                  <FaEye /> {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>

          {/* Table Section */}
          {showTable && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>RECEIPTNO</th>
                    <th>REGNO</th>
                    <th>EXAMFEE</th>
                    <th>FINEFEE</th>
                    <th>CONCESSION</th>
                    <th>EXAMMY</th>
                    <th>COURSE</th>
                    <th>BRANCH</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item, index) => {
                    // Handle both camelCase, PascalCase, lowercase, and UPPERCASE field names from API
                    const receiptNo = item.receiptNo || item.ReceiptNo || item.RECEIPTNO || '';
                    const regNo = item.regNo || item.RegNo || item.REGNO || '';
                    const examFee = item.examFee || item.ExamFee || item.EXAMFEE || '0.00';
                    const fineFee = item.fineFee || item.FineFee || item.FINEFEE || item.finefee || '0.00';
                    const concession = item.concession || item.Concession || item.CONCESSION || '0.00';
                    // API returns "exammy" (all lowercase), so check that first
                    const examMy = item.exammy || item.examMy || item.ExamMy || item.EXAMMY || '';
                    const course = item.course || item.Course || item.COURSE || '';
                    // API returns "grp" for branch
                    const branch = item.grp || item.Grp || item.GRP || item.branch || item.Branch || item.BRANCH || '';

                    return (
                    <tr key={index}>
                      <td className={styles.centerText}>
                        <button 
                            onClick={() => handleReceiptClick(receiptNo)}
                          className={styles.receiptLink}
                        >
                            {receiptNo}
                        </button>
                      </td>
                        <td className={styles.centerText}>{regNo}</td>
                        <td className={styles.centerText}>₹{examFee}</td>
                        <td className={styles.centerText}>₹{fineFee}</td>
                        <td className={styles.centerText}>₹{concession}</td>
                        <td className={styles.centerText}>{examMy}</td>
                        <td className={styles.centerText}>{course}</td>
                        <td className={styles.centerText}>{branch}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage} style={{ 
              color: error.toLowerCase().includes('no receipt data') ? '#ff9800' : 'red', 
              padding: '10px', 
              textAlign: 'center',
              backgroundColor: error.toLowerCase().includes('no receipt data') ? '#fff3e0' : '#ffebee',
              borderRadius: '4px',
              margin: '10px 0'
            }}>
              {error}
            </div>
          )}

          {!showTable && !error && !isLoading && (
            <div className={styles.noDataMessage}>
              Please select date range and click View to see receipt data.
            </div>
          )}
        </div>
      </div>

      {/* Receipt Details Modal */}
      {showReceiptModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Receipt Details</h3>
              <button className={styles.closeButton} onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {isLoadingDetails && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  Loading receipt details...
                </div>
              )}
              
              {detailsError && (
                <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                  {detailsError}
                </div>
              )}
              
              {receiptDetails && !isLoadingDetails && (
                <div className={styles.receiptDetails}>
                  {(() => {
                    // Normalise data - API may return single object or array
                    const detailsArray = Array.isArray(receiptDetails)
                      ? receiptDetails
                      : [receiptDetails];
                    const main = detailsArray[0] || {};

                    const getValue = (...keys) => {
                      for (const k of keys) {
                        if (main[k] !== undefined && main[k] !== null) {
                          return main[k];
                        }
                      }
                      return '';
                    };

                    const formatCurrency = (value) => {
                      const num = parseFloat(value ?? 0);
                      if (Number.isNaN(num)) return '0.00';
                      return num.toFixed(2);
                    };

                    const formatDateTime = (value) => {
                      if (!value) return '';
                      const d = new Date(value);
                      if (Number.isNaN(d.getTime())) {
                        // If parsing fails, just show original string
                        return String(value);
                      }
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = d.getFullYear();
                      const hours = String(d.getHours()).padStart(2, '0');
                      const mins = String(d.getMinutes()).padStart(2, '0');
                      return `${day}-${month}-${year} ${hours}:${mins}`;
                    };

                    const headerData = {
                      receiptNo: getValue('RECEIPTNO', 'ReceiptNo', 'receiptNo'),
                      pdate: formatDateTime(getValue('PDATE', 'PDate', 'pdate')),
                      regNo: getValue('REGNO', 'RegNo', 'regNo'),
                      sname: getValue('SNAME', 'StudentName', 'Name', 'name'),
                      fname: getValue('FNAME', 'FatherName'),
                      course: getValue('COURSE', 'Course', 'course'),
                      branch: getValue('BRANCH', 'Branch', 'branch'),
                      sem: getValue('SEM', 'Sem', 'sem'),
                      examMy: getValue('EXAMMY', 'ExamMy', 'examMy'),
                    };

                    const feeSummary = {
                      examFee: formatCurrency(getValue('EXAMFEE', 'ExamFee', 'examFee')),
                      fineFee: formatCurrency(getValue('FINEFEE', 'FineFee', 'fineFee')),
                      concession: formatCurrency(getValue('CONCESSION', 'Concession', 'concession')),
                      appFee: formatCurrency(getValue('APPFEE', 'AppFee', 'appFee')),
                    };

                    // Try to compute total if possible
                    const totalAmount = (() => {
                      const exam = parseFloat(getValue('EXAMFEE', 'ExamFee', 'examFee') || 0);
                      const fine = parseFloat(getValue('FINEFEE', 'FineFee', 'fineFee') || 0);
                      const concession = parseFloat(getValue('CONCESSION', 'Concession', 'concession') || 0);
                      const app = parseFloat(getValue('APPFEE', 'AppFee', 'appFee') || 0);
                      const total = (exam || 0) + (fine || 0) + (app || 0) - (concession || 0);
                      if (Number.isNaN(total)) return '';
                      return total.toFixed(2);
                    })();

                    const papers =
                      detailsArray.length > 1
                        ? detailsArray
                        : getValue('PAPERS')
                        ? String(getValue('PAPERS')).split(',').map((p) => ({ PAP: p }))
                        : [];

                    return (
                      <>
                        {/* Header summary */}
                        <div className={styles.receiptSummary}>
                          <div className={styles.summaryRow}>
                            <div>
                              <strong>Receipt No:</strong> {headerData.receiptNo || '-'}
                            </div>
                            <div>
                              <strong>Date:</strong> {headerData.pdate || '-'}
                            </div>
                          </div>
                          <div className={styles.summaryRow}>
                            <div>
                              <strong>Reg No:</strong> {headerData.regNo || '-'}
                            </div>
                            <div>
                              <strong>Name:</strong> {headerData.sname || '-'}
                            </div>
                          </div>
                          <div className={styles.summaryRow}>
                            <div>
                              <strong>Father Name:</strong> {headerData.fname || '-'}
                            </div>
                            <div>
                              <strong>Course / Branch:</strong>{' '}
                              {headerData.course || '-'} {headerData.branch ? ` / ${headerData.branch}` : ''}
                            </div>
                          </div>
                          <div className={styles.summaryRow}>
                            <div>
                              <strong>Sem:</strong> {headerData.sem || '-'}
                            </div>
                            <div>
                              <strong>Exam M/Y:</strong> {headerData.examMy || '-'}
                            </div>
                          </div>
                        </div>

                        {/* Fee summary */}
                        <div className={styles.feeSummary}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>Exam Fee</th>
                                <th>Fine Fee</th>
                                <th>Concession</th>
                                <th>Application Fee</th>
                                {totalAmount && <th>Total</th>}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className={styles.centerText}>₹{feeSummary.examFee}</td>
                                <td className={styles.centerText}>₹{feeSummary.fineFee}</td>
                                <td className={styles.centerText}>₹{feeSummary.concession}</td>
                                <td className={styles.centerText}>₹{feeSummary.appFee}</td>
                                {totalAmount && (
                                  <td className={styles.centerText}>₹{totalAmount}</td>
                                )}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Papers / subjects if available */}
                        {papers && papers.length > 0 && (
                          <div className={styles.papersSection}>
                            <h4 style={{ marginBottom: '8px' }}>Subjects / Papers</h4>
                            <table className={styles.dataTable}>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Paper Code</th>
                                  <th>Paper Name</th>
                                </tr>
                              </thead>
                              <tbody>
                                {papers.map((p, idx) => {
                                  const code =
                                    p.PCODE || p.PCode || p.pcode || p.PAP || '';
                                  const name =
                                    p.PNAME || p.PName || p.pname || p.SUBJECT || p.Subject || '';
                                  return (
                                    <tr key={idx}>
                                      <td className={styles.centerText}>{idx + 1}</td>
                                      <td className={styles.centerText}>{code}</td>
                                      <td>{name || code}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptList; 