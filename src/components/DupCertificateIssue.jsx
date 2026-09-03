import React, { useState, useEffect } from 'react';
import { FaEdit } from 'react-icons/fa';
import { saveDupCertificate, getReceiptData, checkRegCount, checkReceiptCount, getAppData } from '../utils/api';
import styles from './DupCertificateIssue.module.css';
import { useTheme } from '../contexts/ThemeContext.jsx';

const DupCertificateIssue = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Certificate type state
  const [certificateType, setCertificateType] = useState(''); // 'hallTicket' or 'marksMemo'

  // Form state
  const [formData, setFormData] = useState({
    receiptNo: '',
    regdNo: '',
    name: '',
    course: '',
    branch: '',
    sem: '',
    remarks: '',
    feeName: ''
  });

  // Issued counts state
  const [issuedCounts, setIssuedCounts] = useState({
    regNoWise: 0,
    receiptNoWise: 0
  });

  // Loading states
  const [saving, setSaving] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Handle certificate type change
  const handleCertificateTypeChange = (type) => {
    setCertificateType(type);
    // Update counts when certificate type changes
    if (formData.regdNo && formData.sem) {
      updateIssuedCounts();
    }
  };

  // Fetch student data by receipt number
  const fetchStudentDataByReceipt = async (receiptNo) => {
    if (!receiptNo || !receiptNo.trim()) {
      // Clear form if receipt number is empty
      setFormData(prev => ({
        ...prev,
        regdNo: '',
        name: '',
        course: '',
        branch: '',
        sem: '',
      }));
      setIssuedCounts({ regNoWise: 0, receiptNoWise: 0 });
      return;
    }
    
    setLoadingReceipt(true);
    try {
      const response = await getReceiptData(receiptNo.trim());
      if (response.success && response.data && response.data.length > 0) {
        const studentData = response.data[0];
        // Map fields from API response: REGNO, SName, Course, GRP (branch), SEM
        const updatedFormData = {
          regdNo: studentData.REGNO || studentData.regNo || studentData.RegNo || '',
          name: studentData.SName || studentData.sName || studentData.NAME || studentData.name || studentData.Name || '',
          course: studentData.Course || studentData.course || studentData.COURSE || '',
          branch: studentData.GRP || studentData.grp || studentData.BRANCH || studentData.branch || studentData.Branch || '',
          sem: studentData.SEM || studentData.sem || studentData.Sem || '',
          feeName: studentData.FEETYPE || studentData.feeType || studentData.FeeType || formData.feeName,
        };
        setFormData(prev => ({
          ...prev,
          ...updatedFormData,
        }));
        // Update counts after form data is set (will be triggered by useEffect)
      } else {
        // Clear form if no data found
        setFormData(prev => ({
          ...prev,
          regdNo: '',
          name: '',
          course: '',
          branch: '',
          sem: '',
        }));
        console.warn(response.message || 'No data found for this receipt number');
      }
    } catch (error) {
      console.error('Error fetching receipt data:', error);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Update issued counts
  const updateIssuedCounts = async () => {
    const appData = getAppData();
    const examMy = appData?.examMY || '';
    
    if (!formData.regdNo || !formData.sem || !examMy || !certificateType) {
      setIssuedCounts({ regNoWise: 0, receiptNoWise: 0 });
      return;
    }

    const certificateName = certificateType === 'hallTicket' ? 'Hall Ticket' : 'MARKS MEMO';
    const sem = parseInt(formData.sem) || 0;

    setLoadingCounts(true);
    try {
      // Check reg count
      const regCountResponse = await checkRegCount(formData.regdNo, sem, examMy, certificateName);
      const regCount = regCountResponse?.data?.Count ?? regCountResponse?.data?.count ?? 0;

      // Check receipt count
      let receiptCount = 0;
      if (formData.receiptNo) {
        const receiptCountResponse = await checkReceiptCount(
          formData.receiptNo,
          formData.regdNo,
          sem,
          examMy,
          certificateName
        );
        receiptCount = receiptCountResponse?.data?.Count ?? receiptCountResponse?.data?.count ?? 0;
      }

      setIssuedCounts({
        regNoWise: regCount,
        receiptNoWise: receiptCount
      });
    } catch (error) {
      console.error('Error fetching issued counts:', error);
      // Don't show alert for count errors, just set to 0
      setIssuedCounts({ regNoWise: 0, receiptNoWise: 0 });
    } finally {
      setLoadingCounts(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch when user clicks outside the field
  const handleBlur = (e) => {
    if (e.target.name === 'receiptNo' && e.target.value) {
      fetchStudentDataByReceipt(e.target.value);
    }
  };

  // Fetch when user presses Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.name === 'receiptNo') {
      e.preventDefault(); // Prevent form submission
      fetchStudentDataByReceipt(e.target.value);
    }
  };

  // Update counts when relevant fields change
  useEffect(() => {
    // Add a small delay to avoid too many API calls
    const timeoutId = setTimeout(() => {
      updateIssuedCounts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.regdNo, formData.sem, formData.receiptNo, certificateType]);

  // Handle save button
  const handleSave = async () => {
    // Validation
    if (!certificateType) {
      alert('Please select certificate type (Hall Ticket or MarksMemo)');
      return;
    }

    if (!formData.receiptNo || !formData.receiptNo.trim()) {
      alert('Please enter Receipt No.');
      return;
    }

    if (!formData.regdNo || !formData.regdNo.trim()) {
      alert('Please enter Regd. No.');
      return;
    }

    if (!formData.sem || !formData.sem.trim()) {
      alert('Please enter Sem');
      return;
    }

    const appData = getAppData();
    const examMy = appData?.examMY || '';

    if (!examMy) {
      alert('Please select Exam M/Y from header dropdown');
      return;
    }

    const sem = parseInt(formData.sem);
    if (isNaN(sem) || sem <= 0) {
      alert('Please enter a valid Sem number');
      return;
    }

    const certificateName = certificateType === 'hallTicket' ? 'Hall Ticket' : 'MARKS MEMO';

    // Prepare API payload
    const payload = {
      receiptNo: formData.receiptNo.trim(),
      regNo: formData.regdNo.trim(),
      sem: sem,
      examMy: examMy,
      certificateName: certificateName,
      remarks: formData.remarks?.trim() || '',
      crId: '' // Can be set from user context if available
    };

    setSaving(true);
    try {
      const response = await saveDupCertificate(payload);
      
      if (response.success) {
        alert(response.message || 'Certificate saved successfully!');
        // Refresh counts after save
        await updateIssuedCounts();
        // Optionally reset form or keep data
        // handleCancel();
      } else {
        alert(response.message || 'Failed to save certificate');
      }
    } catch (error) {
      console.error('Error saving certificate:', error);
      alert(error.message || 'Failed to save certificate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    // Reset form
    setFormData({
      receiptNo: '',
      regdNo: '',
      name: '',
      course: '',
      branch: '',
      sem: '',
      remarks: '',
      feeName: ''
    });
    setIssuedCounts({
      regNoWise: 0,
      receiptNoWise: 0
    });
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Duplicate Certificate Issue</h1>
        </div>
      </div>

      <div className={styles.mainCard}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit className={styles.headerIcon} style={{ color: themeColor }} />
            ISSUE OF DUPLICATE CERTIFICATE
          </h2>
        </div>

        <div className={styles.cardBody}>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            {/* Form Fields Table */}
            <table className={styles.formTable}>
              <tbody>
                {/* Certificate Type Radio Buttons Row */}
                <tr>
                  <td colSpan="4" className={styles.radioCell}>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="certificateType"
                          value="hallTicket"
                          checked={certificateType === 'hallTicket'}
                          onChange={() => handleCertificateTypeChange('hallTicket')}
                          className={styles.radio}
                        />
                        Hall Ticket
                      </label>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="certificateType"
                          value="marksMemo"
                          checked={certificateType === 'marksMemo'}
                          onChange={() => handleCertificateTypeChange('marksMemo')}
                          className={styles.radio}
                        />
                        MarksMemo
                      </label>
                    </div>
                  </td>
                </tr>
                {/* Row 1: Receipt No. and Regd. No. */}
                <tr>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Receipt No.</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="receiptNo"
                      className={styles.input}
                      value={formData.receiptNo}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      placeholder={loadingReceipt ? 'Verifying...' : 'Press Enter or click away to verify'}
                    />
                  </td>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Regd. No.</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="regdNo"
                      className={styles.input}
                      value={formData.regdNo}
                      onChange={handleInputChange}
                    />
                  </td>
                </tr>

                {/* Row 2: Name and Course */}
                <tr>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Name</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="name"
                      className={styles.input}
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </td>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Course</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="course"
                      className={styles.input}
                      value={formData.course}
                      onChange={handleInputChange}
                    />
                  </td>
                </tr>

                {/* Row 3: Branch and Sem */}
                <tr>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Branch</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="branch"
                      className={styles.input}
                      value={formData.branch}
                      onChange={handleInputChange}
                    />
                  </td>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Sem</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="sem"
                      className={styles.input}
                      value={formData.sem}
                      onChange={handleInputChange}
                    />
                  </td>
                </tr>

                {/* Row 4: Remarks and Fee Name */}
                <tr>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Remarks</label>
                  </td>
                  <td className={styles.inputCell}>
                    <textarea
                      name="remarks"
                      className={styles.textarea}
                      rows="2"
                      value={formData.remarks}
                      onChange={handleInputChange}
                    />
                  </td>
                  <td className={styles.labelCell}>
                    <label className={styles.label}>Fee Name</label>
                  </td>
                  <td className={styles.inputCell}>
                    <input
                      type="text"
                      name="feeName"
                      className={styles.input}
                      value={formData.feeName}
                      onChange={handleInputChange}
                    />
                  </td>
                </tr>

                {/* Row 5: Issued Counts */}
                <tr>
                  <td className={styles.countCell}>
                    <label className={styles.countLabel}>Reg No. Wise Issued Count</label>
                  </td>
                  <td className={styles.countValueCell}>
                    <span className={styles.countValue}>{issuedCounts.regNoWise}</span>
                  </td>
                  <td className={styles.countCell}>
                    <label className={styles.countLabel}>Receipt No. Wise Issued Count</label>
                  </td>
                  <td className={styles.countValueCell}>
                    <span className={styles.countValue}>{issuedCounts.receiptNoWise}</span>
                  </td>
                </tr>

                {/* Row 6: Action Buttons */}
                <tr>
                  <td colSpan="4" className={styles.buttonCell}>
                    <br />
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>

          {/* Bottom Panel (for future data display) */}
          <div className={styles.bottomPanel}>
            {/* Panel content will be populated dynamically */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DupCertificateIssue;

