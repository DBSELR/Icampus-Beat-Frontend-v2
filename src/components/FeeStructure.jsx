import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaSync, FaTimes } from 'react-icons/fa';
import { getFeeStructures, getFineFeeList, saveFineFee, getAppData, getSupplementaryFeeGrid, saveSupplementaryFee, saveRegularFee } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './FeeStructure.module.css';

const FeeStructure = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Regular/Supplementary Fee Structure state
  const [regularFormData, setRegularFormData] = useState({
    reguSupply: 'Regular',
    batch: '',
    branch: 'All Branches',
    sem: '3',
    fee: ''
  });

  // Fine Fee Details state
  const [fineFormData, setFineFormData] = useState({
    fineFee: '0',
    semester: '',
    fromDate: '',
    toDate: ''
  });

  // Regular fee structure table data
  const [regularTableData, setRegularTableData] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Fine loading state
  const [fineLoading, setFineLoading] = useState(false);

  // Fine save loading state
  const [fineSaveLoading, setFineSaveLoading] = useState(false);

  // Regular fee save loading state
  const [regularSaveLoading, setRegularSaveLoading] = useState(false);

  // Fine fee table data
  const [fineTableData, setFineTableData] = useState([]);

  // Edit mode states
  const [editingFeeId, setEditingFeeId] = useState(null); // ID of fee structure being edited
  const [editingFineId, setEditingFineId] = useState(null); // ID of fine fee being edited

  // Supplementary paper amounts (for Supplementary view)
  const [supplementaryPapers, setSupplementaryPapers] = useState([]);

  // Supplementary loading states
  const [supplementaryLoading, setSupplementaryLoading] = useState(false);
  const [supplementarySaveLoading, setSupplementarySaveLoading] = useState(false);

  // Dropdown options
  const reguSupplyOptions = ['Regular', 'Supplementary'];
  const batchOptions = ['Select Batch', '2020-2024', '2021-2025', '2022-2026'];
  const branchOptions = ['All Branches', 'CE-CIVIL ENGINEERING', 'ECE-ELECTRONICS & COMMUNICATION ENGINEERING', 'EEE-ELECTRICAL & ELECTRONICS ENGINEERING', 'ME-MECHANICAL ENGINEERING', 'IT-INFORMATION TECHNOLOGY', 'ECM-ELECTRONICS & COMPUTER ENGINEERING'];
  const semesterOptions = ['Select ...', '1', '2', '3', '4', '5', '6', '7', '8'];

  // Fetch fee structures function
  const fetchFeeStructures = async () => {
    setLoading(true);
    try {
      // Get course, examMY, and regulation from localStorage
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        console.log('Missing required parameters from localStorage');
        setRegularTableData([]);
        return;
      }

      console.log('Fetching fee structures with params:', { course, examMY, regulation });
      const response = await getFeeStructures(course, examMY, regulation);

      if (response.success && response.data) {
        // Map API response to table format
        // API returns: { REGU, BATCH, SEM, GRP, AMOUNT, BRANCH }
        const mappedData = response.data.map((fee, index) => ({
          id: index + 1,
          regu: fee.REGU || '',
          batch: fee.BATCH || '-',
          sem: fee.SEM || '-',
          grp: fee.GRP || '',
          branch: fee.BRANCH || '-',
          amount: fee.AMOUNT ? fee.AMOUNT.toFixed(2) : '0.00'
        }));
        setRegularTableData(mappedData);
        console.log('Fee structures loaded:', mappedData);
      } else {
        console.error('Failed to load fee structures:', response.message);
        setRegularTableData([]);
      }
    } catch (error) {
      console.error('Error loading fee structures:', error);
      setRegularTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fine fee list function
  const fetchFineFeeList = async () => {
    setFineLoading(true);
    try {
      // Get course, examMY, and regulation from localStorage
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        console.log('Missing required parameters from localStorage for fine fees');
        setFineTableData([]);
        return;
      }

      console.log('Fetching fine fee list with params:', { course, examMY, regulation });
      const response = await getFineFeeList(course, examMY, regulation);

      if (response.success && response.data) {
        // Map API response to table format
        const mappedData = response.data.map((fine) => ({
          id: fine.fid,
          sem: fine.sem || '-',
          fromDate: fine.FROMDATE ? new Date(fine.FROMDATE).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }) : '-',
          toDate: fine.TODATE ? new Date(fine.TODATE).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }) : '-',
          fineAmount: fine.FINEAMOUNT ? fine.FINEAMOUNT.toFixed(2) : '0.00'
        }));
        setFineTableData(mappedData);
        console.log('Fine fee list loaded:', mappedData);
      } else {
        console.error('Failed to load fine fee list:', response.message);
        setFineTableData([]);
      }
    } catch (error) {
      console.error('Error loading fine fee list:', error);
      setFineTableData([]);
    } finally {
      setFineLoading(false);
    }
  };

  // Fetch supplementary fee grid
  const fetchSupplementaryFeeGrid = async () => {
    setSupplementaryLoading(true);
    try {
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        console.log('Missing required parameters from localStorage for supplementary fees');
        // Set default empty papers if no data
        setSupplementaryPapers([
          { papers: '1', amount: '' },
          { papers: '2', amount: '' },
          { papers: '3', amount: '' },
          { papers: '4', amount: '' },
          { papers: '5', amount: '' },
          { papers: '6', amount: '' },
          { papers: '7', amount: '' },
          { papers: '8', amount: '' }
        ]);
        return;
      }

      console.log('Fetching supplementary fee grid with params:', { course, examMY, regulation });
      const response = await getSupplementaryFeeGrid(course, examMY, regulation, 'S_FEE');

      if (response.success && response.data) {
        // Map API response to papers format
        // API returns: { Papers: 1, Amount: 450.00 }
        const mappedPapers = response.data.map((item) => ({
          papers: (item.Papers ?? item.papers ?? '').toString(),
          amount: (item.Amount ?? item.amount ?? '').toString()
        }));

        // If API returns data, use it; otherwise use default 1-8 papers
        if (mappedPapers.length > 0) {
          setSupplementaryPapers(mappedPapers);
        } else {
          setSupplementaryPapers([
            { papers: '1', amount: '' },
            { papers: '2', amount: '' },
            { papers: '3', amount: '' },
            { papers: '4', amount: '' },
            { papers: '5', amount: '' },
            { papers: '6', amount: '' },
            { papers: '7', amount: '' },
            { papers: '8', amount: '' }
          ]);
        }
        console.log('Supplementary fee grid loaded:', mappedPapers);
      } else {
        console.log('No supplementary fee data, using defaults');
        setSupplementaryPapers([
          { papers: '1', amount: '' },
          { papers: '2', amount: '' },
          { papers: '3', amount: '' },
          { papers: '4', amount: '' },
          { papers: '5', amount: '' },
          { papers: '6', amount: '' },
          { papers: '7', amount: '' },
          { papers: '8', amount: '' }
        ]);
      }
    } catch (error) {
      console.error('Error loading supplementary fee grid:', error);
      // Set default papers on error
      setSupplementaryPapers([
        { papers: '1', amount: '' },
        { papers: '2', amount: '' },
        { papers: '3', amount: '' },
        { papers: '4', amount: '' },
        { papers: '5', amount: '' },
        { papers: '6', amount: '' },
        { papers: '7', amount: '' },
        { papers: '8', amount: '' }
      ]);
    } finally {
      setSupplementaryLoading(false);
    }
  };

  // Load fee structures and fine fees on component mount
  useEffect(() => {
    // Load based on default selection (Regular)
    if (regularFormData.reguSupply === 'Regular') {
      fetchFeeStructures();
    } else {
      fetchSupplementaryFeeGrid();
    }
    // Always load fine fee list
    fetchFineFeeList();
  }, []);

  // Handle regular form input changes
  const handleRegularInputChange = (e) => {
    const { name, value } = e.target;
    setRegularFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If reguSupply dropdown changed, fetch appropriate data
    if (name === 'reguSupply') {
      if (value === 'Regular') {
        fetchFeeStructures();
      } else if (value === 'Supplementary') {
        fetchSupplementaryFeeGrid();
      }
    }
  };

  // Handle fine form input changes
  const handleFineInputChange = (e) => {
    const { name, value } = e.target;
    setFineFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle supplementary paper amount changes
  const handleSupplementaryAmountChange = (index, value) => {
    setSupplementaryPapers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: value };
      return updated;
    });
  };

  // Handle fee structure row click for editing
  const handleFeeRowClick = (record) => {
    setEditingFeeId(record.id);
    setRegularFormData({
      reguSupply: 'Regular',
      batch: record.batch,
      branch: record.branch,
      sem: record.sem,
      fee: record.amount
    });
  };

  // Cancel fee structure editing
  const cancelFeeEdit = () => {
    setEditingFeeId(null);
    handleRegularCancel();
  };

  // Handle fine fee row click for editing
  const handleFineRowClick = (record) => {
    setEditingFineId(record.id);
    // Parse the displayed date back to YYYY-MM-DD format for date input
    const parseDisplayDate = (displayDate) => {
      if (!displayDate || displayDate === '-') return '';
      try {
        const parts = displayDate.split(' ');
        const day = parts[0].replace(',', '');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = (monthNames.indexOf(parts[1]) + 1).toString().padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day.padStart(2, '0')}`;
      } catch {
        return '';
      }
    };

    setFineFormData({
      fineFee: record.fineAmount,
      semester: record.sem,
      fromDate: parseDisplayDate(record.fromDate),
      toDate: parseDisplayDate(record.toDate)
    });
  };

  // Cancel fine fee editing
  const cancelFineEdit = () => {
    setEditingFineId(null);
    handleFineCancel();
  };

  // Handle regular save
  const handleRegularSave = async () => {
    // Validate required fields
    if (!regularFormData.batch || regularFormData.batch === 'Select Batch' || !regularFormData.fee) {
      alert('Please fill all required fields');
      return;
    }

    // Validate fee is a number
    if (isNaN(regularFormData.fee) || parseFloat(regularFormData.fee) <= 0) {
      alert('Please enter a valid fee amount');
      return;
    }

    setRegularSaveLoading(true);

    try {
      // Get course, examMY, and regulation from localStorage
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        alert('Please select course, exam MY, and regulation from header dropdowns');
        setRegularSaveLoading(false);
        return;
      }

      // Extract batch year (e.g., "2020-2024" -> "2020")
      const batchYear = regularFormData.batch.split('-')[0] || regularFormData.batch;

      // Extract group from branch (e.g., "CE-CIVIL ENGINEERING" -> "CE")
      const grp = regularFormData.branch.split('-')[0] || 'A';

      // Prepare data according to API format
      const feeData = {
        batch: batchYear,
        regu: regulation.replace('R', ''), // Remove 'R' prefix if present (R18 -> 18)
        sem: regularFormData.sem,
        course: course,
        grp: grp,
        fromPap: 1,           // Default - all papers
        toPap: 10,            // Default - all papers
        amount: parseFloat(regularFormData.fee),
        stat: 'R',            // R for Regular
        examMy: examMY,
        regulation: regulation,
        allGrp: regularFormData.branch === 'All Branches' // true if all branches selected
      };

      console.log('Saving regular fee:', feeData);
      const response = await saveRegularFee(feeData);

      if (response.success) {
        alert(editingFeeId ? 'Fee structure updated successfully!' : 'Fee structure saved successfully!');
        setEditingFeeId(null);
        handleRegularCancel();
        // Refresh the table
        fetchFeeStructures();
      } else {
        alert('Failed to save fee structure: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving regular fee:', error);
      alert('Error saving fee structure: ' + error.message);
    } finally {
      setRegularSaveLoading(false);
    }
  };

  // Handle supplementary save
  const handleSupplementarySave = async () => {
    // Check if at least one paper has an amount
    const hasAmount = supplementaryPapers.some(p => p.amount && parseFloat(p.amount) > 0);
    if (!hasAmount) {
      alert('Please enter amount for at least one paper');
      return;
    }

    // Validate all entered amounts are valid numbers
    for (const paper of supplementaryPapers) {
      if (paper.amount && (isNaN(paper.amount) || parseFloat(paper.amount) < 0)) {
        alert(`Invalid amount for Paper ${paper.papers}`);
        return;
      }
    }

    setSupplementarySaveLoading(true);

    try {
      // Get course, examMY, and regulation from localStorage
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        alert('Please select course, exam MY, and regulation from header dropdowns');
        setSupplementarySaveLoading(false);
        return;
      }

      // Save each paper with amount > 0
      const papersToSave = supplementaryPapers.filter(p => p.amount && parseFloat(p.amount) > 0);
      let savedCount = 0;
      let errorCount = 0;

      for (const paper of papersToSave) {
        try {
          // Prepare data according to API format
          const feeData = {
            grp: 'A',           // Default group
            pType: 'T',         // Default paper type (Theory)
            examMy: examMY,
            fCount: parseInt(paper.papers),
            amount: parseFloat(paper.amount),
            sType: 'SAVE_FEE',  // Save type
            course: course,
            regulation: regulation
          };

          console.log('Saving supplementary fee:', feeData);
          const response = await saveSupplementaryFee(feeData);

          if (response.success) {
            savedCount++;
          } else {
            errorCount++;
            console.error(`Failed to save paper ${paper.papers}:`, response.message);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error saving paper ${paper.papers}:`, error);
        }
      }

      if (savedCount > 0 && errorCount === 0) {
        alert(`Supplementary fee structure saved successfully! (${savedCount} paper(s))`);
        // Refresh the grid to show updated data
        fetchSupplementaryFeeGrid();
      } else if (savedCount > 0 && errorCount > 0) {
        alert(`Partially saved: ${savedCount} succeeded, ${errorCount} failed`);
        fetchSupplementaryFeeGrid();
      } else {
        alert('Failed to save supplementary fee structure');
      }
    } catch (error) {
      console.error('Error saving supplementary fee:', error);
      alert('Error saving supplementary fee: ' + error.message);
    } finally {
      setSupplementarySaveLoading(false);
    }
  };

  // Handle regular cancel
  const handleRegularCancel = () => {
    setEditingFeeId(null);
    setRegularFormData({
      reguSupply: 'Regular',
      batch: '',
      branch: 'All Branches',
      sem: '3',
      fee: ''
    });
  };

  // Handle supplementary cancel
  const handleSupplementaryCancel = () => {
    // Reload data from API to reset to original values
    fetchSupplementaryFeeGrid();
  };

  // Handle fine save
  const handleFineSave = async () => {
    // Validate required fields
    if (!fineFormData.fineFee || !fineFormData.semester || !fineFormData.fromDate || !fineFormData.toDate) {
      alert('Please fill all required fields');
      return;
    }

    // Validate fine fee is a number
    if (isNaN(fineFormData.fineFee) || parseFloat(fineFormData.fineFee) < 0) {
      alert('Please enter a valid fine fee amount');
      return;
    }

    setFineSaveLoading(true);

    try {
      // Get course, examMY, and regulation from localStorage
      const appData = getAppData();
      const course = appData?.course;
      const examMY = appData?.examMY;
      const regulation = appData?.regulation;

      if (!course || !examMY || !regulation) {
        alert('Please select course, exam MY, and regulation from header dropdowns');
        setFineSaveLoading(false);
        return;
      }

      // Prepare fine fee data for API
      const fineData = {
        course: course,
        examMy: examMY,
        sem: parseInt(fineFormData.semester),
        fineAmt: parseFloat(fineFormData.fineFee),
        fromDate: fineFormData.fromDate, // YYYY-MM-DD format from date input
        toDate: fineFormData.toDate, // YYYY-MM-DD format from date input
        fid: editingFineId || 0, // Use existing ID for update, 0 for new (insert)
        regulation: regulation
      };

      const response = await saveFineFee(fineData);

      if (response.success) {
        alert(editingFineId ? 'Fine fee details updated successfully!' : 'Fine fee details saved successfully!');
        console.log('Fine fee saved:', response);

        // Reset form and edit mode
        setEditingFineId(null);
        handleFineCancel();

        // Refresh fine fee list from API
        fetchFineFeeList();
      } else {
        alert('Failed to save fine fee: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving fine fee:', error);
      alert('Error saving fine fee: ' + error.message);
    } finally {
      setFineSaveLoading(false);
    }
  };

  // Handle fine cancel
  const handleFineCancel = () => {
    setEditingFineId(null);
    setFineFormData({
      fineFee: '0',
      semester: '',
      fromDate: '',
      toDate: ''
    });
  };

  // Handle fine delete
  const handleFineDelete = (id) => {
    const record = fineTableData.find(item => item.id === id);
    if (window.confirm(`Do you want to delete this fine fee record?\nSemester: ${record?.sem}\nFine Amount: ${record?.fineAmount}`)) {
      setFineTableData(prev => prev.filter(item => item.id !== id));
      alert('Record deleted successfully!');
    }
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.row}>
        {/* Left Section: Regular or Supplementary Fee Structure */}
        <div className={styles.leftSection}>
          <div className={styles.box}>
            <div className={styles.boxHeader}>
              <h2>
                <FaEdit className={styles.headerIcon} />
                Regular or Supplementary Fee Structure
              </h2>
              <div className={styles.boxIcon}>
                <button 
                  className={styles.iconBtn} 
                  title="Refresh Fee Structures"
                  onClick={fetchFeeStructures}
                  disabled={loading}
                >
                  <FaSync />
                </button>
              </div>
            </div>
            <div className={styles.boxContent}>
              <div className={styles.formContainer}>
                {/* Edit Mode Indicator */}
                {editingFeeId && (
                  <div className={styles.editModeIndicator}>
                    <span>Editing Fee Structure</span>
                    <button onClick={cancelFeeEdit} className={styles.cancelEditBtn} title="Cancel Edit">
                      <FaTimes />
                    </button>
                  </div>
                )}

                <div className={styles.formSection}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Select Regu./Supply.</label>
                    <select
                      name="reguSupply"
                      value={regularFormData.reguSupply}
                      onChange={handleRegularInputChange}
                      className={styles.dropdown}
                      disabled={editingFeeId !== null}
                    >
                      {reguSupplyOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Regular Fee Form - shown when Regular is selected */}
                  {regularFormData.reguSupply === 'Regular' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Batch</label>
                        <select
                          name="batch"
                          value={regularFormData.batch}
                          onChange={handleRegularInputChange}
                          className={styles.dropdown}
                        >
                          {batchOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Branch</label>
                        <select
                          name="branch"
                          value={regularFormData.branch}
                          onChange={handleRegularInputChange}
                          className={styles.dropdown}
                        >
                          {branchOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Sem</label>
                        <input
                          type="text"
                          name="sem"
                          value={regularFormData.sem}
                          onChange={handleRegularInputChange}
                          className={styles.input}
                          placeholder="Sem"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Fee</label>
                        <input
                          type="text"
                          name="fee"
                          value={regularFormData.fee}
                          onChange={handleRegularInputChange}
                          className={styles.input}
                          placeholder="Fee"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Regular Fee Structure Table - shown when Regular is selected */}
                {regularFormData.reguSupply === 'Regular' && (
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Batch</th>
                          <th>SEM</th>
                          <th>Branch</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="4" className={styles.centerText}>
                              Loading fee structures...
                            </td>
                          </tr>
                        ) : regularTableData.length === 0 ? (
                          <tr>
                            <td colSpan="4" className={styles.centerText}>
                              No fee structures found
                            </td>
                          </tr>
                        ) : (
                          regularTableData.map((record) => (
                            <tr
                              key={record.id}
                              onClick={() => handleFeeRowClick(record)}
                              className={`${styles.clickableRow} ${editingFeeId === record.id ? styles.selectedRow : ''}`}
                              title="Click to edit"
                            >
                              <td className={styles.centerText}>{record.batch}</td>
                              <td className={styles.centerText}>{record.sem}</td>
                              <td className={styles.branchName}>{record.branch}</td>
                              <td className={styles.centerText}>{record.amount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Supplementary Fee Grid - shown when Supplementary is selected */}
                {regularFormData.reguSupply === 'Supplementary' && (
                  <div className={styles.supplementarySection}>
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>PAPER (S)</th>
                            <th>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplementaryLoading ? (
                            <tr>
                              <td colSpan="2" className={styles.centerText}>
                                Loading supplementary fees...
                              </td>
                            </tr>
                          ) : supplementaryPapers.length === 0 ? (
                            <tr>
                              <td colSpan="2" className={styles.centerText}>
                                No supplementary fee data
                              </td>
                            </tr>
                          ) : (
                            supplementaryPapers.map((paper, index) => (
                              <tr key={paper.papers}>
                                <td className={styles.centerText}>{paper.papers}</td>
                                <td className={styles.centerText}>
                                  <input
                                    type="text"
                                    value={paper.amount}
                                    onChange={(e) => handleSupplementaryAmountChange(index, e.target.value)}
                                    className={styles.tableInput}
                                    placeholder="Enter amount"
                                    disabled={supplementarySaveLoading}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  {regularFormData.reguSupply === 'Regular' ? (
                    <>
                      <button
                        onClick={handleRegularSave}
                        className={styles.saveBtn}
                        disabled={regularSaveLoading || loading}
                      >
                        {regularSaveLoading ? 'Saving...' : (editingFeeId ? 'Update' : 'Save')}
                      </button>
                      <button
                        onClick={handleRegularCancel}
                        className={styles.cancelBtn}
                        disabled={regularSaveLoading}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSupplementarySave}
                        className={styles.saveBtn}
                        disabled={supplementarySaveLoading || supplementaryLoading}
                      >
                        {supplementarySaveLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleSupplementaryCancel}
                        className={styles.cancelBtn}
                        disabled={supplementarySaveLoading}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Fine Fee Details */}
        <div className={styles.rightSection}>
          <div className={styles.box}>
            <div className={styles.boxHeader}>
              <h2>
                <FaEdit className={styles.headerIcon} />
                Fine Fee Details
              </h2>
              <div className={styles.boxIcon}>
                <button 
                  className={styles.iconBtn} 
                  title="Refresh Fine Fee List"
                  onClick={fetchFineFeeList}
                  disabled={fineLoading}
                >
                  <FaSync />
                </button>
              </div>
            </div>
            <div className={styles.boxContent}>
              <div className={styles.formContainer}>
                {/* Edit Mode Indicator */}
                {editingFineId && (
                  <div className={styles.editModeIndicator}>
                    <span>Editing Fine Fee</span>
                    <button onClick={cancelFineEdit} className={styles.cancelEditBtn} title="Cancel Edit">
                      <FaTimes />
                    </button>
                  </div>
                )}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fine Fee</label>
                    <input
                      type="text"
                      name="fineFee"
                      value={fineFormData.fineFee}
                      onChange={handleFineInputChange}
                      className={styles.input}
                      placeholder="Fee"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Semester</label>
                    <select
                      name="semester"
                      value={fineFormData.semester}
                      onChange={handleFineInputChange}
                      className={styles.dropdown}
                    >
                      {semesterOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>From</label>
                    <input
                      type="date"
                      name="fromDate"
                      value={fineFormData.fromDate}
                      onChange={handleFineInputChange}
                      className={styles.input}
                      placeholder="From Date"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>To</label>
                    <input
                      type="date"
                      name="toDate"
                      value={fineFormData.toDate}
                      onChange={handleFineInputChange}
                      className={styles.input}
                      placeholder="To Date"
                    />
                  </div>
                </div>

                {/* Fine Fee Table */}
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Sem</th>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>Fine Amount</th>
                        <th>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fineLoading ? (
                        <tr>
                          <td colSpan="5" className={styles.centerText}>
                            Loading fine fee list...
                          </td>
                        </tr>
                      ) : fineTableData.length === 0 ? (
                        <tr>
                          <td colSpan="5" className={styles.centerText}>
                            No fine fees found
                          </td>
                        </tr>
                      ) : (
                        fineTableData.map((record) => (
                          <tr
                            key={record.id}
                            className={`${styles.clickableRow} ${editingFineId === record.id ? styles.selectedRow : ''}`}
                          >
                            <td className={styles.centerText}>{record.sem}</td>
                            <td className={styles.centerText}>{record.fromDate}</td>
                            <td className={styles.centerText}>{record.toDate}</td>
                            <td className={styles.centerText}>
                              <span
                                onClick={() => handleFineRowClick(record)}
                                className={styles.clickableAmount}
                                title="Click to edit"
                              >
                                {record.fineAmount}
                              </span>
                            </td>
                            <td className={styles.centerText}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFineDelete(record.id);
                                }}
                                className={styles.deleteBtn}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <button
                    onClick={handleFineSave}
                    className={styles.saveBtn}
                    disabled={fineSaveLoading}
                  >
                    {fineSaveLoading ? 'Saving...' : (editingFineId ? 'Update' : 'Save')}
                  </button>
                  <button onClick={handleFineCancel} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructure; 