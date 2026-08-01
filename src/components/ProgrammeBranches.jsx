import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaCopy, FaChevronUp, FaSync, FaCalendarAlt } from 'react-icons/fa';
import { getCourseBranchGrid, saveCourseBranch, deleteCourseBranch, copyCourseBranch, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './ProgrammeBranches.module.css';

const ProgrammeBranches = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Form state
  const [formData, setFormData] = useState({
    regulation: '',
    fromYear: '',
    toYear: '',
    programme: 'B.TECH',
    degree: '',
    branchCode: '',
    branchName: '',
    maxSem: ''
  });

  // Table data state
  const [tableData, setTableData] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyFormData, setCopyFormData] = useState({
    fromBatch: '',
    toBatch: '',
    toBatchRegulation: ''
  });

  // Fetch grid data from API
  const fetchGridData = async () => {
    setLoading(true);
    try {
      const appData = getAppData();
      const course = appData?.course;
      const regulation = appData?.regulation;

      if (!course || !regulation) {
        setTableData([]);
        setLoading(false);
        return;
      }

      const response = await getCourseBranchGrid('Course Data', course, regulation);

      if (response.success && response.data) {
        const mappedData = response.data.map((item, index) => ({
          id: index + 1,
          regulation: item.regulation,
          regu: item.regu,
          batch: item.batch,
          degree: item.degree,
          branch: item.grp,
          branchName: item.gsub,
          course: item.course,
          maxsem: item.maxsem
        }));
        setTableData(mappedData);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching grid data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGridData();
  }, []);

  useEffect(() => {
    const appData = getAppData();
    if (appData) {
      setFormData(prev => ({
        ...prev,
        regulation: appData.regulation || '',
        programme: appData.course || 'B.TECH'
      }));
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.regulation || !formData.fromYear || !formData.toYear || !formData.degree || !formData.branchCode || !formData.branchName || !formData.maxSem) {
      alert('Please fill all required fields');
      return;
    }

    if (isNaN(formData.maxSem) || formData.maxSem < 1 || formData.maxSem > 10) {
      alert('Max Sem must be a number between 1 and 10');
      return;
    }

    setSaveLoading(true);

    try {
      const fromYearShort = formData.fromYear.substring(2);
      const toYearShort = formData.toYear.substring(2);
      const batch = `${formData.fromYear}-${toYearShort}`;

      const courseBranchData = {
        regulation: formData.regulation,
        batch: batch,
        course: formData.programme,
        courseName: formData.degree,
        grp: formData.branchCode,
        grpName: formData.branchName,
        maxSem: parseInt(formData.maxSem),
        maxStreams: 1,
        grpOrder: 0,
        isUpdate: false
      };

      const response = await saveCourseBranch(courseBranchData);

      if (response.success) {
        alert('Record saved successfully!');
        const appData = getAppData();
        setFormData({
          regulation: appData?.regulation || '',
          fromYear: '',
          toYear: '',
          programme: appData?.course || 'B.TECH',
          degree: '',
          branchCode: '',
          branchName: '',
          maxSem: ''
        });
        fetchGridData();
      } else {
        alert('Failed to save record: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error saving record: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    const appData = getAppData();
    setFormData({
      regulation: appData?.regulation || '',
      fromYear: '',
      toYear: '',
      programme: appData?.course || 'B.TECH',
      degree: '',
      branchCode: '',
      branchName: '',
      maxSem: ''
    });
  };

  const handleDelete = async (id) => {
    const record = tableData.find(item => item.id === id);

    if (!record) {
      alert('Record not found');
      return;
    }

    if (!window.confirm(`Do you want to delete ${record.branchName || 'this record'}?`)) {
      return;
    }

    setDeleteLoading(true);

    try {
      const deleteData = {
        batch: record.regu,
        course: record.course || 'B.TECH',
        grp: record.branch,
        courseName: record.degree || 'UG',
        grpName: record.branchName,
        grpOrder: 0
      };

      const response = await deleteCourseBranch(deleteData);

      if (response.success) {
        alert('Record deleted successfully!');
        fetchGridData();
      } else {
        alert('Failed to delete record: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error deleting record: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (id) => {
    const record = tableData.find(item => item.id === id);
    if (!record) return;

    let fromYear = '';
    let toYear = '';

    if (record.batch && record.batch.includes('-')) {
      const parts = record.batch.split('-');
      fromYear = parts[0];
      const shortYear = parts[1];
      if (shortYear.length === 2) {
        const prefix = fromYear.substring(0, 2);
        toYear = prefix + shortYear;
      } else {
        toYear = shortYear;
      }
    }

    setFormData({
      regulation: record.regulation || '',
      fromYear: fromYear,
      toYear: toYear,
      programme: record.course || 'B.TECH',
      degree: record.degree || '',
      branchCode: record.branch || '',
      branchName: record.branchName || '',
      maxSem: record.maxsem ? String(record.maxsem) : ''
    });

    setIsFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = () => setShowCopyModal(true);

  const handleCopyInputChange = (e) => {
    const { name, value } = e.target;
    setCopyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopySave = async () => {
    if (!copyFormData.fromBatch || !copyFormData.toBatch || !copyFormData.toBatchRegulation) {
      alert('Please fill all fields');
      return;
    }

    setCopyLoading(true);

    try {
      const appData = getAppData();
      const course = appData?.course || 'B.TECH';
      const regulation = appData?.regulation || 'R11';

      const extractShortBatch = (year) => year.substring(2);

      const copyData = {
        regulation: regulation,
        toBatch: extractShortBatch(copyFormData.toBatch),
        fromBatch: extractShortBatch(copyFormData.fromBatch),
        course: course
      };

      const response = await copyCourseBranch(copyData);

      if (response.success) {
        alert('Course branches copied successfully!');
        handleCopyModalClose();
        fetchGridData();
      } else {
        alert('Failed to copy course branches: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Error copying course branches: ' + error.message);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleCopyModalClose = () => {
    setShowCopyModal(false);
    setCopyFormData({ fromBatch: '', toBatch: '', toBatchRegulation: '' });
  };

  return (
    <div className={styles.pageRoot}>
      
      {/* ── Page Header ─────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Course / Branch Master</h1>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.dateChip}>
            <FaCalendarAlt style={{ color: themeColor }} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Main Card ───────────────────────────────── */}
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FaEdit style={{ color: themeColor }} />
            Manage Branches
          </h2>
          <div className={styles.headerActions}>
            <button
              className={styles.iconBtn}
              onClick={fetchGridData}
              title="Refresh Grid Data"
              disabled={loading}
            >
              <FaSync className={loading ? styles.spinning : ''} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              title="Toggle Form"
            >
              <FaChevronUp className={isFormCollapsed ? styles.rotated : ''} />
            </button>
          </div>
        </div>

        {/* ── Form Section ────────────────────────────── */}
        <div className={`${styles.formSection} ${isFormCollapsed ? styles.collapsed : ''}`}>
          <div className={styles.formGrid}>
            
            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Regulation</label>
              <input
                type="text"
                name="regulation"
                value={formData.regulation}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter regulation"
                style={{ '--theme-color': themeColor }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Batch (From - To)</label>
              <div className={styles.batchGroup}>
                <select
                  name="fromYear"
                  value={formData.fromYear}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  style={{ '--theme-color': themeColor }}
                >
                  <option value="">From</option>
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={2015 + i}>{2015 + i}</option>
                  ))}
                </select>
                <span>-</span>
                <select
                  name="toYear"
                  value={formData.toYear}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  style={{ '--theme-color': themeColor }}
                >
                  <option value="">To</option>
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={2019 + i}>{2019 + i}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Programme</label>
              <input
                type="text"
                name="programme"
                value={formData.programme}
                onChange={handleInputChange}
                className={styles.formInput}
                style={{ '--theme-color': themeColor }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Degree</label>
              <input
                type="text"
                name="degree"
                value={formData.degree}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter degree"
                style={{ '--theme-color': themeColor }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Branch Code</label>
              <input
                type="text"
                name="branchCode"
                value={formData.branchCode}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter branch code"
                style={{ '--theme-color': themeColor }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Branch Name</label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter branch name"
                style={{ '--theme-color': themeColor }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.formLabel}>Max Sem</label>
              <input
                type="number"
                name="maxSem"
                value={formData.maxSem}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter max semesters"
                min="1" max="10"
                style={{ '--theme-color': themeColor }}
              />
            </div>

          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.btnPrimary}
              onClick={handleSave}
              disabled={saveLoading}
              style={{ '--theme-color': themeColor }}
            >
              {saveLoading ? 'Saving...' : 'Save Record'}
            </button>
            <button
              className={styles.btnSecondary}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleCopy}
              title="Copy Course, Branches From Previous Batch"
              style={{ marginLeft: 'auto' }}
            >
              <FaCopy />
            </button>
          </div>
        </div>

        {/* ── Data Table ──────────────────────────────── */}
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.centerText}>Regulation</th>
                <th className={styles.centerText}>Batch</th>
                <th>Degree</th>
                <th>Branch Code</th>
                <th>Branch Name</th>
                <th className={styles.centerText}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className={styles.loadingState}>
                    Loading data...
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyState}>
                    No data available. Please select course and regulation from header dropdowns.
                  </td>
                </tr>
              ) : (
                tableData.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.centerText}>{item.regulation}</td>
                    <td className={styles.centerText}>
                      <span style={{ 
                        background: `${themeColor}15`, 
                        color: themeColor,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}>
                        {item.batch}
                      </span>
                    </td>
                    <td>{item.degree}</td>
                    <td>
                      <a
                        href="#"
                        className={styles.branchLink}
                        onClick={(e) => {
                          e.preventDefault();
                          handleEdit(item.id);
                        }}
                        style={{ '--theme-color': themeColor, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {item.branch}
                        <FaEdit style={{ fontSize: '12px', opacity: 0.8 }} />
                      </a>
                    </td>
                    <td className={styles.branchName}>{item.branchName}</td>
                    <td className={styles.centerText}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.id)}
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

      {/* ── Copy Modal ───────────────────────────────── */}
      {showCopyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>
              <h3 className={styles.modalTitle}>Copy Batch Data</h3>
              <button
                className={styles.closeBtn}
                onClick={handleCopyModalClose}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>From Batch</label>
                <input
                  type="text"
                  name="fromBatch"
                  value={copyFormData.fromBatch}
                  onChange={handleCopyInputChange}
                  className={styles.formInput}
                  placeholder="e.g. 2016"
                  style={{ '--theme-color': themeColor }}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>To Batch</label>
                <input
                  type="text"
                  name="toBatch"
                  value={copyFormData.toBatch}
                  onChange={handleCopyInputChange}
                  className={styles.formInput}
                  placeholder="e.g. 2019"
                  style={{ '--theme-color': themeColor }}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.formLabel}>To Batch Regulation</label>
                <input
                  type="text"
                  name="toBatchRegulation"
                  value={copyFormData.toBatchRegulation}
                  onChange={handleCopyInputChange}
                  className={styles.formInput}
                  placeholder="Enter regulation"
                  style={{ '--theme-color': themeColor }}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={handleCopyModalClose}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleCopySave}
                disabled={copyLoading}
                style={{ '--theme-color': themeColor }}
              >
                {copyLoading ? 'Copying...' : 'Copy Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgrammeBranches;