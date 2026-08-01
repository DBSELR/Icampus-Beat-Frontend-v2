import React, { useState, useEffect, useCallback } from 'react';
import { FaCalendarAlt, FaChevronUp, FaTrash, FaSave } from 'react-icons/fa';
import { getAppData, loadExamMyUpdate, updateExamMyUpdate, deleteExamMyUpdate } from '../utils/api';
import styles from './ExamMyUpdate.module.css';

const ExamMyUpdate = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();

  const [formData, setFormData] = useState({ batch: '', branch: '', sem: '' });
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const batchOptions = ['15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'];
  const branchOptions = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML'];
  const semOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const fetchGrid = useCallback(async () => {
    const batch = String(formData.batch || '').trim();
    const branch = String(formData.branch || '').trim();
    const sem = String(formData.sem || '').trim();
    if (!regulation || !course) {
      setTableData([]); setShowTable(false);
      setLoadError('Application context: select Regulation and Course.'); return;
    }
    if (!batch || !branch || !sem) { setTableData([]); setShowTable(false); setLoadError(''); return; }
    setLoading(true); setLoadError('');
    try {
      const res = await loadExamMyUpdate(regulation, course, batch, branch, sem);
      if (!res.success || !res.data) {
        setTableData([]); setShowTable(res.data && res.data.length > 0);
        setLoadError(res.message || 'No records found'); return;
      }
      const rows = (res.data || []).map((row) => ({
        ashid: row.ASHID ?? row.ashid ?? 0,
        regulation: row.REGULATION ?? row.regulation ?? regulation,
        regu: row.REGU ?? row.regu ?? batch,
        course: row.COURSE ?? row.course ?? course,
        grp: row.GRP ?? row.grp ?? branch,
        sem: row.SEM ?? row.sem ?? sem,
        stream: row.STREAM ?? row.stream ?? '',
        regno: row.REGNO ?? row.regno ?? '',
        exammy: row.EXAMMY ?? row.exammy ?? '',
        actExammy: row.ACT_EXAMMY ?? row.act_EXAMMY ?? row.actExammy ?? ''
      }));
      setTableData(rows);
      setShowTable(rows.length > 0);
      if (rows.length === 0) setLoadError(res.message || 'No records found');
    } catch (err) {
      console.error('ExamMyUpdate load error:', err);
      setTableData([]); setShowTable(false);
      setLoadError(err?.message || 'Failed to load data');
    } finally { setLoading(false); }
  }, [regulation, course, formData.batch, formData.branch, formData.sem]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTableInputChange = (ashid, value) => {
    setTableData(prev => prev.map(item => item.ashid === ashid ? { ...item, actExammy: value } : item));
  };

  const handleDelete = async (ashid) => {
    if (!window.confirm('Do you want to delete this record?')) return;
    try {
      const res = await deleteExamMyUpdate(ashid);
      if (res?.success) { setTableData(prev => prev.filter(item => item.ashid !== ashid)); alert(res.message || 'Record deleted.'); }
      else alert(res?.message || 'Delete failed.');
    } catch (err) { console.error('Delete error:', err); alert(err?.message || 'Failed to delete record'); }
  };

  const handleUpdateExammy = async () => {
    if (!regulation || !course) { alert('Application context: select Regulation and Course.'); return; }
    const batch = String(formData.batch || '').trim();
    const branch = String(formData.branch || '').trim();
    const sem = String(formData.sem || '').trim();
    if (!batch || !branch || !sem) { alert('Please select Batch, Branch and Sem.'); return; }
    if (tableData.length === 0) { alert('No data to update.'); return; }
    const rowsToUpdate = tableData.filter((item) => String(item.actExammy ?? '').trim() !== '');
    if (rowsToUpdate.length === 0) { alert('Please fill ACT EXAMMY for at least one row.'); return; }
    const rows = rowsToUpdate.map((item) => ({
      act_EXAMMY: String(item.actExammy).trim(), regulation: String(item.regulation).trim(),
      batch: String(item.regu).trim(), course: String(item.course).trim(),
      branch: String(item.grp).trim(), sem: String(item.sem).trim(),
      regno: String(item.regno).trim(), exammy: String(item.exammy).trim()
    }));
    try {
      const res = await updateExamMyUpdate(rows);
      alert(res?.message ?? 'ExamMY updated.');
      fetchGrid();
    } catch (err) { console.error('Update error:', err); alert(err?.message || 'Failed to update ExamMY'); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaCalendarAlt className={styles.headerIcon} />
            Update Exam Month &amp; Year
          </h2>
          <div className={styles.headerActions}>
            <button
              className={`${styles.minimizeBtn} ${isFormCollapsed ? styles.rotated : ''}`}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className={styles.boxContent}>
          <div className={`${styles.formContainer} ${isFormCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.formSection}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Batch</label>
                  <select name="batch" value={formData.batch} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="">Select Batch</option>
                    {batchOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="">Select Branch</option>
                    {branchOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Semester</label>
                  <select name="sem" value={formData.sem} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="">Select</option>
                    {semOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading && <div className={styles.loadingMessage}>Loading...</div>}
          {loadError && !loading && <div className={styles.errorMessage}>{loadError}</div>}

          {showTable && !loading ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>REGU</th>
                    <th>COURSE</th>
                    <th>GRP</th>
                    <th>SEM</th>
                    <th>STREAM</th>
                    <th>REGNO</th>
                    <th>EXAMMY</th>
                    <th>ACT EXAMMY</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item) => (
                    <tr key={item.ashid}>
                      <td className={styles.centerText}>{item.regu}</td>
                      <td className={styles.centerText}>{item.course}</td>
                      <td className={styles.centerText}>{item.grp}</td>
                      <td className={styles.centerText}>{item.sem}</td>
                      <td className={styles.centerText}>{item.stream}</td>
                      <td className={styles.centerText}>{item.regno}</td>
                      <td className={styles.centerText}>{item.exammy}</td>
                      <td className={styles.centerText}>
                        <input type="text" value={item.actExammy} onChange={(e) => handleTableInputChange(item.ashid, e.target.value)} className={styles.tableInput} placeholder="e.g. Jun-2021" />
                      </td>
                      <td className={styles.centerText}>
                        <button type="button" onClick={() => handleDelete(item.ashid)} className={styles.deleteBtn} title="Delete">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.updateButtonContainer}>
                <button type="button" onClick={handleUpdateExammy} className={styles.updateBtn}>
                  <FaSave /> UPDATE EXAMMY
                </button>
              </div>
            </div>
          ) : !loading && !loadError ? (
            <div className={styles.noDataMessage}>
              Select Batch, Branch and Semester to load data. Ensure Regulation and Course are set.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ExamMyUpdate;
