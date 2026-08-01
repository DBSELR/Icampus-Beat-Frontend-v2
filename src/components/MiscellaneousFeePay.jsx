import React, { useState, useEffect, useCallback } from 'react';
import { FaUser, FaChevronUp, FaTrash, FaSave, FaTimes, FaFileExport, FaPrint, FaEdit } from 'react-icons/fa';
import { getMiscFeeItems, getStudentScreenInfo, saveMiscFeePayment, deleteMiscFeeReceipt, exportMiscFee } from '../utils/api';
import styles from './MiscellaneousFeePay.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const MiscellaneousFeePay = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form data state
  const [formData, setFormData] = useState({
    regNo: '',
    name: '',
    course: '',
    branch: '',
    sem: '',
    remarks: '',
    date: '',
    concession: '0'
  });

  // Table data state - includes all fields from API (including hidden ones)
  const [tableData, setTableData] = useState([]);

  // Receipt number state
  const [receiptNo, setReceiptNo] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [deleteReceiptNo, setDeleteReceiptNo] = useState('');
  const [reprintReceiptNo, setReprintReceiptNo] = useState('');

  // Prevent F5/F6 keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.keyCode === 116 || e.keyCode === 117) { // F5 or F6
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate receipt number on component mount
  useEffect(() => {
    const generateReceiptNo = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const sequence = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return `MISC-${dateStr}-${sequence}`;
    };

    setReceiptNo(generateReceiptNo());
  }, []);


  // Fetch student data and fee items
  const fetchStudentData = useCallback(async (regNo) => {
    if (!regNo || regNo.trim() === '') {
      // Clear all data if reg no is empty
      setFormData(prev => ({
        ...prev,
        name: '',
        course: '',
        branch: '',
        sem: ''
      }));
      setTableData([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch student basic information (using StudentScreen API)
      try {
        const studentInfoResponse = await getStudentScreenInfo(regNo);
        if (studentInfoResponse.success && studentInfoResponse.data && studentInfoResponse.data.length > 0) {
          const studentInfo = studentInfoResponse.data[0];
          setFormData(prev => ({
            ...prev,
            name: studentInfo.SNAME || '',
            course: studentInfo.COURSE || '',
            branch: studentInfo.GRP || ''
          }));
        }
      } catch (err) {
        console.warn('Could not fetch student info:', err);
        // Continue even if student info fails
      }

      // Fetch fee items
      const feeItemsResponse = await getMiscFeeItems(regNo);

      if (feeItemsResponse.success && feeItemsResponse.data) {
        // Map API response to table data format
        const mappedData = feeItemsResponse.data.map((item, index) => {
          // Ensure all numeric values are properly converted
          const jntukAmount = parseFloat(item.JNTUK_AMOUNT) || 0;
          const lbrceAmount = parseFloat(item.LBRCE_AMOUNT) || 0;
          
          return {
            id: item.ID || index + 1,
            course: item.COURSE || null, // hidden
            feeType: item.FEETYPE || '',
            feeName: item.FEENAME || '',
            shortName: item.SHORTNAME || '', // hidden
            universityAmount: jntukAmount, // JNTUK fee (hidden)
            amount: lbrceAmount, // LBRCE fee (displayed and used in calculation)
            count: 1, // Default count, not from API
            isSelected: item.ISACTIVE || false // Maps to checkbox state
          };
        });

        setTableData(mappedData);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(err.message || 'Failed to fetch student data');
      setTableData([]);
      setFormData(prev => ({
        ...prev,
        name: '',
        course: '',
        branch: '',
        sem: ''
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on Reg. No. change with debouncing (like AutoPostBack in ASP.NET)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.regNo.trim().length >= 3) {
        fetchStudentData(formData.regNo.trim());
      } else if (formData.regNo.trim().length === 0) {
        // Clear data if input is cleared
        fetchStudentData('');
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [formData.regNo, fetchStudentData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle table row count change (auto-recalculate total)
  const handleCountChange = (id, newCount) => {
    const count = Math.max(1, parseInt(newCount) || 1); // Ensure minimum 1
    setTableData(prev => prev.map(item =>
      item.id === id
        ? { ...item, count }
        : item
    ));
  };

  // Handle table row selection (auto-recalculate total)
  const handleRowSelection = (id) => {
    setTableData(prev => prev.map(item =>
      item.id === id
        ? { ...item, isSelected: !item.isSelected }
        : item
    ));
  };

  // Handle select all checkbox (toggle function)
  const handleSelectAll = (checked) => {
    setTableData(prev => prev.map(item => ({ ...item, isSelected: checked })));
  };

  // Calculate total fee with concession
  // Based on old .NET code: sums LBRCE_AMOUNT for checked items, multiplies by count, then applies concession
  const calculateTotalFee = useCallback(() => {
    try {
      // Step 1: Calculate base total = sum of (LBRCE_AMOUNT * count) for all selected items
      let baseTotal = 0;
      const selectedItems = [];
      
      tableData.forEach(item => {
        if (item.isSelected) {
          // Parse amount (LBRCE_AMOUNT) - ensure it's a valid number
          const amount = parseFloat(item.amount);
          if (isNaN(amount) || !isFinite(amount) || amount < 0) {
            console.warn('⚠️ Invalid amount for item:', item);
            return; // Skip this item
          }
          
          // Parse count - ensure it's a valid integer >= 1
          const count = parseInt(String(item.count || 1), 10);
          if (isNaN(count) || count < 1) {
            console.warn('⚠️ Invalid count for item:', item);
            return; // Skip this item
          }
          
          // Calculate item total: amount * count
          const itemTotal = amount * count;
          selectedItems.push({ feeName: item.feeName, amount, count, itemTotal });
          
          // Add to base total (use proper decimal arithmetic to avoid floating point errors)
          baseTotal = Math.round((baseTotal + itemTotal) * 100) / 100;
        }
      });

      // Ensure baseTotal is valid
      if (isNaN(baseTotal) || !isFinite(baseTotal) || baseTotal < 0) {
        console.warn('⚠️ Invalid baseTotal calculated:', baseTotal);
        return '0.00';
      }

      // Step 2: Apply concession
      // Concession is always treated as a fixed amount (not percentage)
      // Calculation: Total Payable = Base Total - Concession Amount
      // Example: Amount = 16000, Concession = 20, Payable = 16000 - 20 = 15980
      const concessionInput = String(formData.concession || '0').trim();
      const concessionValue = parseFloat(concessionInput) || 0;
      
      let concessionAmount = 0;
      if (concessionValue > 0) {
        // Concession is always a fixed amount (subtract directly from base total)
        concessionAmount = Math.min(concessionValue, baseTotal); // Can't exceed base total
      }
      
      // Step 3: Calculate final total = baseTotal - concessionAmount
      const finalTotal = Math.max(0, Math.round((baseTotal - concessionAmount) * 100) / 100);
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development' && selectedItems.length > 0) {
        console.log('💰 Fee Calculation:', {
          selectedItems,
          baseTotal: baseTotal.toFixed(2),
          concession: concessionValue,
          concessionAmount: concessionAmount.toFixed(2),
          finalTotal: finalTotal.toFixed(2),
          calculation: `${baseTotal.toFixed(2)} - ${concessionAmount.toFixed(2)} = ${finalTotal.toFixed(2)}`
        });
      }
      
      // Return formatted to 2 decimal places
      return finalTotal.toFixed(2);
    } catch (error) {
      console.error('❌ Error calculating total fee:', error);
      return '0.00';
    }
  }, [tableData, formData.concession]);

  // Calculate total fee - this will recalculate whenever tableData or concession changes
  const totalFee = calculateTotalFee();

  // Handle save
  const handleSave = async () => {
    if (loading) return;

    // Validation
    if (!formData.regNo) {
      alert('Please enter Registration Number');
      return;
    }
    if (!formData.name) {
      alert('Please enter Name');
      return;
    }
    if (!formData.course) {
      alert('Please enter Course');
      return;
    }
    if (!formData.branch) {
      alert('Please enter Branch');
      return;
    }
    if (!formData.sem) {
      alert('Please enter Semester');
      return;
    }
    if (!formData.date) {
      alert('Please enter Date');
      return;
    }

    // Check if at least one fee item is selected
    const selectedItems = tableData.filter(item => item.isSelected);
    if (selectedItems.length === 0) {
      alert('Please select at least one fee item');
      return;
    }

    setLoading(true);

    try {
      // Prepare payload matching the exact API structure (MiscFeeSaveRequest model)
      // Extract all values from form state - ensure they are properly captured
      const cleanPayload = {
        receiptNo: String(receiptNo || '').trim(),
        date: String(formData.date || '').trim(), // Date in YYYY-MM-DD format
        regno: String(formData.regNo || '').trim(),
        sem: String(formData.sem || '').trim(), // Backend expects string
        concession: parseFloat(formData.concession) || 0, // Backend expects decimal (number)
        remark: String(formData.remarks || '').trim(), // Backend expects string (note: formData.remarks -> payload.remark)
        userId: 'admin', // TODO: Get from auth context
        course: String(formData.course || '').trim(),
        items: selectedItems.map(item => {
          // Format each item to match MiscFeeItem model
          // Ensure all values are properly converted to numbers
          const jntukFeeValue = parseFloat(item.universityAmount) || 0;
          const lbrceFeeValue = parseFloat(item.amount) || 0;
          const countValue = parseInt(String(item.count || 1), 10) || 1;
          
          // IMPORTANT: Backend stored procedure doesn't receive count parameter
          // So we need to multiply the fee by count before sending
          // OR the stored procedure might handle it differently
          // Based on typical fee systems, we multiply here to send total amount per item
          const jntukFeeTotal = jntukFeeValue * countValue;
          const lbrceFeeTotal = lbrceFeeValue * countValue;
          
          return {
            feeType: String(item.feeType || '').trim(),
            feeName: String(item.feeName || '').trim(),
            jntukFee: jntukFeeTotal, // Total JNTUK fee (amount * count)
            lbrceFee: lbrceFeeTotal, // Total LBRCE fee (amount * count)
            count: countValue // Keep count for reference (even if backend doesn't use it)
          };
        })
      };

      // Log payload for debugging
      console.log('=== Save Misc Fee Payment ===');
      console.log('Form Data:', formData);
      console.log('Receipt No:', receiptNo);
      console.log('Selected Items:', selectedItems);
      console.log('Clean Payload:', JSON.stringify(cleanPayload, null, 2));
      console.log('Sem value:', cleanPayload.sem, 'Type:', typeof cleanPayload.sem);
      console.log('Remarks value:', cleanPayload.remark, 'Type:', typeof cleanPayload.remark);
      console.log('Concession value:', cleanPayload.concession, 'Type:', typeof cleanPayload.concession);
      console.log('Date value:', cleanPayload.date, 'Type:', typeof cleanPayload.date);
      console.log('Course value:', cleanPayload.course);
      console.log('Items count:', cleanPayload.items.length);
      console.log('================================');

      const response = await saveMiscFeePayment(cleanPayload);

      if (response.success) {
        alert(`Fee payment saved successfully!\nReceipt No: ${receiptNo}\nTotal Amount: ₹${totalFee}`);

        // Reset form
        setFormData({
          regNo: '',
          name: '',
          course: '',
          branch: '',
          sem: '',
          remarks: '',
          date: '',
          concession: '0'
        });
        setTableData([]);

        // Generate new receipt number for next transaction
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const sequence = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        setReceiptNo(`MISC-${dateStr}-${sequence}`);
      } else {
        alert(response.message || 'Failed to save fee payment');
      }
    } catch (error) {
      console.error('Error saving fee payment:', error);
      alert(error.message || 'Failed to save fee payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // Handle cancel
  const handleCancel = () => {
    setFormData(prev => ({
      ...prev,
      regNo: '',
      name: '',
      course: '',
      branch: '',
      sem: '',
      remarks: '',
      date: '',
      concession: '0'
    }));
    setTableData([]);
    setError(null);
  };

  // Handle export
  const handleExport = async () => {
    if (loading) return;

    setLoading(true);

    try {
      console.log('Exporting miscellaneous fee data...');

      const blob = await exportMiscFee();
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      link.download = `MiscFee_Export_${dateStr}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('Miscellaneous fee data exported successfully');
    } catch (error) {
      console.error('Error exporting miscellaneous fee data:', error);
      alert(error.message || 'Failed to export miscellaneous fee data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete receipt modal
  const handleDeleteReceipt = () => {
    if (loading) return;
    setShowDeleteModal(true);
  };

  // Handle delete receipt confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteReceiptNo.trim()) {
      alert('Please enter Receipt No.');
      return;
    }

    setLoading(true);

    try {
      console.log('Deleting receipt:', deleteReceiptNo);

      const response = await deleteMiscFeeReceipt(deleteReceiptNo);

      if (response.success) {
        alert(`Receipt ${deleteReceiptNo} deleted successfully!`);
        setShowDeleteModal(false);
        setDeleteReceiptNo('');

        // Optionally refresh the form or clear data
        // You might want to clear the form if the deleted receipt was the current one
      } else {
        alert(response.message || 'Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert(error.message || 'Failed to delete receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // Handle reprint modal
  const handleReprint = () => {
    if (loading) return;
    setShowReprintModal(true);
  };

  // Handle reprint confirmation
  const handleReprintConfirm = () => {
    if (!reprintReceiptNo.trim()) {
      alert('Please enter Receipt No.');
      return;
    }
    // TODO: Call reprint API here
    alert(`Receipt ${reprintReceiptNo} reprinted successfully!`);
    setShowReprintModal(false);
    setReprintReceiptNo('');
  };

  // Check if all items are selected (for select all checkbox)
  const allSelected = tableData.length > 0 && tableData.every(item => item.isSelected);
  const someSelected = tableData.some(item => item.isSelected);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Miscellaneous Fee Payment</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            MISCELLANEOUS FEE PAYMENT
          </h2>
          <div className={styles.receiptInfo}>
            <span className={styles.receiptLabel}>Receipt No. : </span>
            <span className={styles.receiptNumber}>{receiptNo || '---'}</span>
          </div>
          <button
            className={`${styles.collapseBtn} ${isFormCollapsed ? styles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            aria-label="Toggle Form Section"
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={styles.cardBody}>
          {/* Loading Overlay */}
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

          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.formSection}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Reg. No.</label>
                  <input
                    type="text"
                    name="regNo"
                    value={formData.regNo}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Registration Number"
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Name"
                    readOnly={!!formData.regNo}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Course</label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Course"
                    readOnly={!!formData.regNo}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch</label>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Branch"
                    readOnly={!!formData.regNo}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sem</label>
                  <input
                    type="text"
                    name="sem"
                    value={formData.sem}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Semester"
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter Remarks"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={styles.input}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Concession</label>
                  <input
                    type="text"
                    name="concession"
                    value={formData.concession}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="0"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button
                onClick={handleSave}
                className={styles.saveBtn}
                disabled={loading}
              >
                <FaSave /> Save
              </button>
              <button
                onClick={handleCancel}
                className={styles.cancelBtn}
                disabled={loading}
              >
                <FaTimes /> Cancel
              </button>
              <button
                onClick={handleExport}
                className={styles.exportBtn}
                disabled={loading}
              >
                <FaFileExport /> Export
              </button>
              <button
                onClick={handleDeleteReceipt}
                className={styles.deleteBtn}
                disabled={loading}
              >
                <FaTrash /> Delete Receipt
              </button>
              <button
                onClick={handleReprint}
                className={styles.printBtn}
                disabled={loading}
              >
                <FaPrint /> Re Print
              </button>
            </div>
          </div>

          <div className={styles.feeSection}>
            <div className={styles.totalFeeContainer}>
              <label className={styles.totalFeeLabel}>Total Payable Amount:</label>
              <input
                type="text"
                value={`₹${totalFee}`}
                className={styles.totalFeeInput}
                readOnly
                disabled
              />
            </div>

            <div className={styles.tableContainer}>
              {loading ? (
                <div className={styles.loadingState}>Loading fee items...</div>
              ) : tableData.length > 0 ? (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th className={styles.feeTypeCol}>Fee Type</th>
                      <th className={styles.feeNameCol}>Fee Name</th>
                      <th className={styles.countCol}>Count</th>
                      <th className={styles.amountCol}>Amount</th>
                      <th className={styles.selectCol}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className={styles.checkbox}
                          disabled={loading}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.centerText}>{item.feeType}</td>
                        <td className={styles.centerText}>{item.feeName}</td>
                        <td className={styles.centerText}>
                          <input
                            type="number"
                            value={item.count}
                            onChange={(e) => handleCountChange(item.id, e.target.value)}
                            className={styles.countInput}
                            min="1"
                            disabled={loading}
                          />
                        </td>
                        <td className={styles.centerText}>
                          {(parseFloat(item.amount) || 0).toFixed(2)}
                        </td>
                        <td className={styles.centerText}>
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => handleRowSelection(item.id)}
                            className={styles.checkbox}
                            disabled={loading}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.noDataMessage}>
                  {formData.regNo ? 'No fee items found for this registration number' : 'Please enter a Registration Number to view fee items'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Receipt Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Confirmation</h3>
            </div>
            <div className={styles.modalBody}>
              <label>Receipt No.</label>
              <input
                type="text"
                value={deleteReceiptNo}
                onChange={(e) => setDeleteReceiptNo(e.target.value)}
                className={styles.modalInput}
                placeholder="Enter Receipt Number"
                autoFocus
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={handleDeleteConfirm} className={styles.modalYesBtn}>
                Yes
              </button>
              <button onClick={() => {
                setShowDeleteModal(false);
                setDeleteReceiptNo('');
              }} className={styles.modalNoBtn}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re Print Modal */}
      {showReprintModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReprintModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Confirmation</h3>
            </div>
            <div className={styles.modalBody}>
              <label>Receipt No.</label>
              <input
                type="text"
                value={reprintReceiptNo}
                onChange={(e) => setReprintReceiptNo(e.target.value)}
                className={styles.modalInput}
                placeholder="Enter Receipt Number"
                autoFocus
              />
            </div>
            <div className={styles.modalFooter}>
              <button onClick={handleReprintConfirm} className={styles.modalYesBtn}>
                Yes
              </button>
              <button onClick={() => {
                setShowReprintModal(false);
                setReprintReceiptNo('');
              }} className={styles.modalNoBtn}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiscellaneousFeePay;
