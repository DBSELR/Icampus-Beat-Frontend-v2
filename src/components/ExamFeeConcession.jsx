import React, { useEffect, useState } from 'react';
import { FaEdit, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import styles from './ExamFeeConcession.module.css';
import {
  getExamFeeConcessionSems,
  getExamFeeConcessionStudent,
  getExamFeeConcessionGrid,
  saveExamFeeConcession,
  deleteExamFeeConcession,
  checkExamFeeConcessionRegSup,
  getExamFeeConcessionFee,
  getAppData,
} from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ExamFeeConcession = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    registrationNo: '',
    sem: '',
    batch: '',
    branch: '',
    name: '',
    totalAmount: '',
    fineAmount: '',
    concession: '',
    feeToBePaid: '',
    remarks: ''
  });

  // Table data state
  const [tableData, setTableData] = useState([]);
  const [sems, setSems] = useState([]);
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';
  const examMy = appData.examMY || '';

  // Load semesters on mount (like old ddlsem load)
  useEffect(() => {
    const loadSems = async () => {
      if (!course || !regulation) {
        // Header dropdowns not selected yet
        return;
      }
      try {
        const response = await getExamFeeConcessionSems(course, regulation);
        if (response && response.data) {
          const data = Array.isArray(response.data) ? response.data : [response.data];
          setSems(data);
        } else {
          setSems([]);
        }
      } catch (err) {
        console.error('Error loading sems for ExamFeeConcession:', err);
        setSems([]);
      }
    };

    loadSems();
  }, [course, regulation]);

  // Helper: normalise numeric field
  const toNumber = (val) => {
    const num = parseFloat(val);
    return Number.isNaN(num) ? 0 : num;
  };

  // Load grid data
  const loadGrid = async (regNo, semValue) => {
    if (!course || !examMy || !regNo) return;
    try {
      setIsLoading(true);
      setError('');
      const response = await getExamFeeConcessionGrid(course, examMy, regNo, semValue || 0);
      if (response && response.data) {
        const rows = Array.isArray(response.data) ? response.data : [response.data];
        setTableData(rows);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error('Error loading ExamFeeConcession grid:', err);
      setError(err.message || 'Failed to load Exam Fee Concession data');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load fee data when semester is selected
  // This checks if semester is Regular or Supply and loads appropriate fee
  const loadFeeForSemester = async (semValue, regNo) => {
    if (!semValue || !regNo) return;
    if (!course || !examMy || !regulation) {
      console.warn('Missing course, examMy, or regulation');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Get current form data for batch and branch
      const currentBatch = formData.batch || '';
      const currentBranch = formData.branch || '';

      // First check if semester is Regular or Supply
      const regSupResponse = await checkExamFeeConcessionRegSup(
        currentBatch, 
        parseInt(semValue, 10) || 0, 
        course, 
        examMy
      );

      console.log('RegSup check response:', regSupResponse);

      // Get fee data using the fee API (which automatically uses REG or SUP stored procedure)
      const feeResponse = await getExamFeeConcessionFee(
        course,
        examMy,
        regulation,
        currentBatch,
        semValue,
        currentBranch,
        regNo
      );

      console.log('Fee API Response:', feeResponse);

      if (feeResponse && feeResponse.success && feeResponse.data && feeResponse.data.length > 0) {
        const feeData = Array.isArray(feeResponse.data) ? feeResponse.data[0] : feeResponse.data;

        const getVal = (...keys) => {
          for (const k of keys) {
            if (feeData[k] !== undefined && feeData[k] !== null && feeData[k] !== '') {
              return feeData[k];
            }
          }
          return '';
        };

        // Extract fee amounts
        const totalAmt = getVal('TotalAmount', 'TOTALAMOUNT', 'TotAmount', 'Totamt', 'TotalAmt', 'totalAmount');
        const fineAmt = getVal('FineAmount', 'FINEAMOUNT', 'FineFee', 'FineAmt', 'fineAmount');
        const concessionAmt = getVal('Concession', 'CONCESSION', 'concession') || formData.concession || '0';

        // Calculate FeeToBePaid: (Total Amount + Fine Amount) - Concession Amount
        const total = toNumber(totalAmt);
        const fine = toNumber(fineAmt);
        const concession = toNumber(concessionAmt);
        const feeToBePaid = ((total + fine) - concession).toFixed(2);

        console.log('Fee calculation:', { total, fine, concession, feeToBePaid });

        // Update form with fee data
        setFormData(prev => ({
          ...prev,
          totalAmount: totalAmt || '0',
          fineAmount: fineAmt || '0',
          concession: concessionAmt || prev.concession || '0',
          feeToBePaid: feeToBePaid || '0.00'
        }));
      } else {
        console.warn('No fee data returned from API');
        // Don't clear existing data, just log warning
      }
    } catch (err) {
      console.error('Error loading fee for semester:', err);
      setError(err.message || 'Failed to load fee data for selected semester');
    } finally {
      setIsLoading(false);
    }
  };

  // Load student + fee info
  const loadStudent = async (regNo) => {
    if (!regNo) return;
    if (!course || !examMy || !regulation) {
      alert('Please select Regulation, Course and Exam M/Y from the header dropdowns');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await getExamFeeConcessionStudent(regNo);
      
      console.log('Student API Response:', response); // Debug log
      
      if (response && response.data && response.data.length > 0) {
        const s = Array.isArray(response.data) ? response.data[0] : response.data;

        console.log('Student data object:', s); // Debug log to see actual field names

        const getVal = (...keys) => {
          for (const k of keys) {
            if (s[k] !== undefined && s[k] !== null && s[k] !== '') {
              return s[k];
            }
          }
          return '';
        };

        // Get semester value
        const semValue = getVal('Sem', 'SEM', 'sem', 'Semester', 'SEMESTER');
        
        // Get batch/regu value
        const batchValue = getVal('Regu', 'REGU', 'Batch', 'BATCH', 'batch', 'regu');
        
        // Get branch value
        const branchValue = getVal('Branch', 'BRANCH', 'Grp', 'GRP', 'branch', 'grp');
        
        // Get name value
        const nameValue = getVal('SName', 'SNAME', 'Name', 'StudentName', 'name', 'studentName');

        console.log('Extracted values:', { 
          semValue, batchValue, branchValue, nameValue 
        }); // Debug log

        setFormData((prev) => ({
          ...prev,
          registrationNo: regNo,
          sem: prev.sem || String(semValue || ''),
          batch: batchValue || '',
          branch: branchValue || '',
          name: nameValue || '',
          // Don't set fee amounts here - they will be loaded when semester is selected
          totalAmount: prev.totalAmount || '0',
          fineAmount: prev.fineAmount || '0',
          feeToBePaid: prev.feeToBePaid || '0.00',
          // Keep existing concession and remarks
        }));

        // If semester is already selected, load fee data
        if (formData.sem || semValue) {
          await loadFeeForSemester(formData.sem || String(semValue || ''), regNo);
        }

        // Load grid for this student
        await loadGrid(regNo, formData.sem || semValue);
      } else {
        setError(response?.message || 'No student data found for this registration number');
        // Clear form if no data found
        setFormData(prev => ({
          ...prev,
          registrationNo: regNo,
          totalAmount: '0',
          fineAmount: '0',
          feeToBePaid: '0.00',
          name: '',
          batch: '',
          branch: '',
        }));
      }
    } catch (err) {
      console.error('Error loading ExamFeeConcession student:', err);
      setError(err.message || 'Failed to load student data');
      // Clear form on error
      setFormData(prev => ({
        ...prev,
        totalAmount: '0',
        fineAmount: '0',
        feeToBePaid: '0.00',
        name: '',
        batch: '',
        branch: '',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate Fee To Be Paid whenever totalAmount, fineAmount, or concession changes
  // Formula: FeeToBePaid = (Total Amount + Fine Amount) - Concession Amount
  useEffect(() => {
    const total = toNumber(formData.totalAmount || '0');
    const fine = toNumber(formData.fineAmount || '0');
    const concession = toNumber(formData.concession || '0');
    
    // Calculate: (Total Amount + Fine Amount) - Concession
    const calculatedFee = (total + fine) - concession;
    const feeToBePaid = calculatedFee.toFixed(2);
    
    // Always update feeToBePaid - use functional update to avoid dependency issues
    setFormData(prev => {
      // Update if the calculated value is different from current
      if (prev.feeToBePaid !== feeToBePaid) {
        return {
          ...prev,
          feeToBePaid: feeToBePaid
        };
      }
      return prev;
    });
  }, [formData.totalAmount, formData.fineAmount, formData.concession, formData.feeToBePaid]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // If concession, totalAmount, or fineAmount changes, immediately recalculate feeToBePaid
      if (name === 'concession' || name === 'totalAmount' || name === 'fineAmount') {
        const total = toNumber(updated.totalAmount || '0');
        const fine = toNumber(updated.fineAmount || '0');
        const concession = toNumber(updated.concession || '0');
        const calculatedFee = (total + fine) - concession;
        updated.feeToBePaid = calculatedFee.toFixed(2);
      }
      
      return updated;
    });

    // If registration number changes, fetch data (AutoPostBack behavior)
    if (name === 'registrationNo') {
      if (value && value.trim().length >= 5) {
        // Mimic AutoPostBack after user types regno
        loadStudent(value.trim());
      } else {
        setTableData([]);
        setError('');
        // Clear form when registration number is cleared
        setFormData(prev => ({
          ...prev,
          totalAmount: '',
          fineAmount: '',
          feeToBePaid: '',
          name: '',
          batch: '',
          branch: '',
          sem: '',
        }));
      }
    }

    // If sem changes, check Regular/Supply and fetch fee data (AutoPostBack behavior)
    if (name === 'sem') {
      if (formData.registrationNo && value) {
        loadFeeForSemester(value, formData.registrationNo);
        loadGrid(formData.registrationNo, value);
      }
    }
  };

  // Handle save button
  const handleSave = async () => {
    if (!formData.registrationNo || !formData.registrationNo.trim()) {
      alert('Please enter RegistrationNO.');
      return;
    }
    if (!formData.sem) {
      alert('Please select Sem');
      return;
    }
    if (!course || !examMy || !regulation) {
      alert('Please select Regulation, Course and Exam M/Y from the header dropdowns');
      return;
    }

    const semNumber = parseInt(formData.sem, 10);
    if (Number.isNaN(semNumber) || semNumber <= 0) {
      alert('Please select a valid Sem');
      return;
    }

    const totalAmount = toNumber(formData.totalAmount);
    const fineAmount = toNumber(formData.fineAmount);
    const concession = toNumber(formData.concession);
    // Fixed calculation: FeeToBePaid = (Total Amount + Fine Amount) - Concession Amount
    const tobePaid = toNumber(formData.feeToBePaid || ((totalAmount + fineAmount) - concession));

    const payload = {
      Regulation: regulation,
      Regno: formData.registrationNo.trim(),
      Sem: semNumber,
      TotalAmount: totalAmount,
      FineAmount: fineAmount,
      Concession: concession,
      TobePaid: tobePaid,
      Regu: formData.batch || '',
      ExamMy: examMy,
      Remarks: formData.remarks || '',
    };

    try {
      setIsSaving(true);
      setError('');
      const response = await saveExamFeeConcession(payload);
      if (response.success) {
        alert(response.message || 'Exam Fee Concession saved successfully');
        // Reload grid
        await loadGrid(formData.registrationNo, formData.sem);
      } else {
        alert(response.message || 'Failed to save Exam Fee Concession');
      }
    } catch (err) {
      console.error('Error saving ExamFeeConcession:', err);
      alert(err.message || 'Failed to save Exam Fee Concession');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    // Reset form
    setFormData({
      registrationNo: '',
      sem: '',
      batch: '',
      branch: '',
      name: '',
      totalAmount: '',
      fineAmount: '',
      concession: '',
      feeToBePaid: '',
      remarks: ''
    });
    setError('');
  };

  // Handle export button
  const handleExport = () => {
    // TODO: Implement export logic
    alert('Export functionality will be implemented');
  };

  // Handle delete row
  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('Do you want to delete this record?')) {
      return;
    }
    try {
      setIsLoading(true);
      const response = await deleteExamFeeConcession(id);
      if (response.success) {
        alert(response.message || 'Record deleted successfully');
        await loadGrid(formData.registrationNo, formData.sem);
      } else {
        alert(response.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting ExamFeeConcession record:', err);
      alert(err.message || 'Failed to delete record');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle row click (for edit)
  const handleRowClick = (row) => {
    // Get TobePaid value from API response (capital T, lowercase o, capital P)
    const tobePaidRaw = row.TobePaid ?? row.ToBePaid ?? row.tobepaid ?? row.feesToBePaid ?? '';
    let feeToBePaidVal = '';
    if (tobePaidRaw !== '' && tobePaidRaw !== null && tobePaidRaw !== undefined) {
      const numVal = parseFloat(tobePaidRaw);
      if (!isNaN(numVal)) {
        feeToBePaidVal = Math.max(0, numVal).toFixed(2);
      } else {
        feeToBePaidVal = String(tobePaidRaw);
      }
    }
    
    setFormData({
      registrationNo: row.RegistrationNo ?? row.registrationNo ?? row.Regno ?? '',
      sem: row.Sem ?? row.sem ?? '',
      batch: row.Regu ?? row.regu ?? row.Batch ?? '',
      branch: row.Branch ?? row.branch ?? row.Grp ?? row.grp ?? '',
      name: row.SName ?? row.sName ?? row.Name ?? row.name ?? '',
      totalAmount: row.TotalAmount ?? row.totalAmount ?? '',
      fineAmount: row.FineAmount ?? row.fineAmount ?? '',
      concession: row.Concession ?? row.concession ?? '',
      feeToBePaid: feeToBePaidVal || '0.00',
      remarks: row.Remarks ?? row.remarks ?? row.REMARKS ?? ''
    });
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Exam Fee Concession</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            EXAM FEE CONCESSION
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
                          >
                            <option value="">Select Sem</option>
                            {sems.map((item, index) => {
                              const semValue =
                                item.Sem ??
                                item.SEM ??
                                item.sem ??
                                item.SemNo ??
                                item.SEMNO ??
                                '';

                              if (!semValue) {
                                return null;
                              }

                              return (
                                <option key={semValue || index} value={semValue}>
                                  {semValue}
                                </option>
                              );
                            })}
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

                    {/* Row 3: Name and Total Amount */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Name</label>
                          <input
                            type="text"
                            name="name"
                            className={styles.input}
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Total Amount</label>
                          <input
                            type="text"
                            name="totalAmount"
                            className={styles.input}
                            value={formData.totalAmount || '0'}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Row 4: Fine Amount and Concession */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Fine Amount</label>
                          <input
                            type="text"
                            name="fineAmount"
                            className={styles.input}
                            value={formData.fineAmount || '0'}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Concession</label>
                          <input
                            type="text"
                            name="concession"
                            className={styles.input}
                            value={formData.concession || ''}
                            onChange={handleInputChange}
                            placeholder="Enter concession amount"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Row 5: Fee TobePaid and Remarks */}
                    <tr>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Fee TobePaid</label>
                          <input
                            type="text"
                            name="feeToBePaid"
                            className={styles.input}
                            value={formData.feeToBePaid || '0.00'}
                            onChange={handleInputChange}
                            readOnly
                          />
                        </div>
                      </td>
                      <td>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Remarks</label>
                          <textarea
                            name="remarks"
                            className={styles.textarea}
                            rows="3"
                            value={formData.remarks || ''}
                            onChange={handleInputChange}
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
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={handleExport}
                  >
                    Export
                  </button>
                </div>
              </div>
            </form>

            {/* Bottom Panel with Table */}
            <div className={styles.bottomPanel}>
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Regulation</th>
                    <th>Exammy</th>
                    <th>REGU</th>
                    <th>RegistrationNo</th>
                    <th>Sem</th>
                    <th>TotalAmt</th>
                    <th>FineAmount</th>
                    <th>Concession</th>
                    <th>FeesToBePaid</th>
                    <th>Remarks</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="11" className={styles.emptyTable}>
                        Loading...
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td colSpan="11" className={styles.emptyTable}>
                        No data available
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, index) => {
                      const id = row.ID ?? row.Id ?? row.id;
                      const regulationVal = row.Regulation ?? row.regulation ?? '';
                      const exammyVal = row.Exammy ?? row.EXAMMY ?? row.examMy ?? '';
                      const reguVal = row.Regu ?? row.regu ?? row.Batch ?? '';
                      const regNoVal = row.RegistrationNo ?? row.registrationNo ?? row.Regno ?? '';
                      const semVal = row.Sem ?? row.sem ?? '';
                      const totalVal = row.TotalAmount ?? row.totalAmount ?? row.Totamt ?? '';
                      const fineVal = row.FineAmount ?? row.fineAmount ?? '';
                      const concessionVal = row.Concession ?? row.concession ?? '';
                      // API returns "TobePaid" (capital T, lowercase o, capital P)
                      // Also handle negative values - show 0.00 if negative (as per calculation logic)
                      const tobePaidRaw = row.TobePaid ?? row.ToBePaid ?? row.tobepaid ?? row.feesToBePaid ?? row.TobePaid ?? '';
                      let toBePaidVal = '';
                      if (tobePaidRaw !== '' && tobePaidRaw !== null && tobePaidRaw !== undefined) {
                        const numVal = parseFloat(tobePaidRaw);
                        if (!isNaN(numVal)) {
                          // If negative, show 0.00 (as per calculation: Math.max(0, ...))
                          toBePaidVal = Math.max(0, numVal).toFixed(2);
                        } else {
                          toBePaidVal = String(tobePaidRaw);
                        }
                      }
                      
                      // API may or may not return Remarks field
                      const remarksVal = row.Remarks ?? row.remarks ?? row.REMARKS ?? '';

                      return (
                        <tr key={id || index} onClick={() => handleRowClick(row)}>
                          <td>{regulationVal}</td>
                          <td>{exammyVal}</td>
                          <td>{reguVal}</td>
                          <td>{regNoVal}</td>
                          <td>{semVal}</td>
                          <td>{totalVal}</td>
                          <td>{fineVal}</td>
                          <td>{concessionVal}</td>
                          <td>{toBePaidVal}</td>
                          <td>{remarksVal}</td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(id);
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </td>
                        </tr>
                      );
                    })
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

export default ExamFeeConcession;

