import React, { useState, useEffect, useCallback } from 'react';
import { FaUserSlash, FaChevronUp } from 'react-icons/fa';
import { getAppData, getMidAbsenteesPapers, getMidAbsenteesStudents, saveMidAbsenteesEntry } from '../utils/api';
import styles from './MidAbsenteesEntry.module.css';

const MidAbsenteesEntry = () => {
  const appData = getAppData() || {};
  const regulation = (appData.regulation || '').trim();
  const course = (appData.course || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [formData, setFormData] = useState({ examType: '', semester: '', branch: '', pCode: '' });
  const [papers, setPapers] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const semOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const examTypeOptions = [
    { value: '', label: 'Select Exam Type' },
    { value: '1', label: 'Mid 1' },
    { value: '2', label: 'Mid 2' }
  ];
  const branchOptions = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CAD/CAM', 'AIDS', 'AIML'];

  const canLoadPapers = regulation && course && examMY && formData.examType && formData.semester && formData.branch;
  const canLoadStudents = canLoadPapers && formData.pCode && formData.examType;

  const fetchPapers = useCallback(async () => {
    if (!canLoadPapers) { setPapers([]); return; }
    setLoadingPapers(true); setLoadError('');
    try {
      const res = await getMidAbsenteesPapers(regulation, examMY, formData.semester, course, formData.branch);
      if (res?.success && Array.isArray(res?.data)) {
        setPapers(res.data.map((p) => ({ value: p.PCODE ?? p.pcode ?? '', label: p.PName ?? p.pName ?? p.PCODE ?? p.pcode ?? '' })));
        if (!formData.pCode && res.data.length > 0) {
          const first = res.data[0];
          setFormData((prev) => ({ ...prev, pCode: first.PCODE ?? first.pcode ?? '' }));
        }
      } else { setPapers([]); }
    } catch (err) {
      console.error('MidAbsenteesEntry papers error:', err);
      setPapers([]); setLoadError(err?.message || 'Failed to load papers');
    } finally { setLoadingPapers(false); }
  }, [regulation, examMY, course, formData.examType, formData.semester, formData.branch, canLoadPapers]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const fetchStudents = useCallback(async () => {
    if (!canLoadStudents) { setTableData([]); setShowTable(false); return; }
    setLoadingStudents(true); setLoadError('');
    try {
      const res = await getMidAbsenteesStudents(regulation, examMY, formData.semester, course, formData.branch, formData.pCode, formData.examType);
      if (res?.success && Array.isArray(res?.data)) {
        const rows = (res.data || []).map((row) => ({
          ashid: row.aSHID ?? row.ASHID ?? row.ashid ?? 0,
          regNo: row.RegNo ?? row.regNo ?? '',
          grp: row.GRP ?? row.grp ?? '',
          pcode: row.PCODE ?? row.pcode ?? '',
          midcode: row.MIDCODE ?? row.midcode ?? row.midCode ?? ''
        }));
        setTableData(rows); setShowTable(rows.length > 0);
      } else {
        setTableData([]); setShowTable(false);
        setLoadError(res?.message || 'No students found');
      }
    } catch (err) {
      console.error('MidAbsenteesEntry students error:', err);
      setTableData([]); setShowTable(false);
      setLoadError(err?.message || 'Failed to load students');
    } finally { setLoadingStudents(false); }
  }, [regulation, examMY, course, formData.semester, formData.branch, formData.pCode, formData.examType, canLoadStudents]);

  useEffect(() => {
    if (canLoadStudents) fetchStudents();
    else { setTableData([]); setShowTable(false); }
  }, [canLoadStudents, fetchStudents]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLoadError('');
  };

  const handleCodeChange = (ashid, newCode) => {
    const value = String(newCode || '').toUpperCase();
    setTableData((prev) => prev.map((row) => (row.ashid === ashid ? { ...row, midcode: value } : row)));
  };

  const handleCodeBlur = async (row) => {
    const code = String(row.midcode || '').trim().toUpperCase();
    if (!code || (code !== 'AB' && code !== 'MP')) return;
    if (!formData.examType) return;
    setSavingId(row.ashid);
    try {
      await saveMidAbsenteesEntry(row.ashid, code, formData.examType);
    } catch (err) {
      console.error('Save mid absentee error:', err);
      alert(err?.message || 'Failed to save code');
    } finally { setSavingId(null); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUserSlash className={styles.headerIcon} />
            Mid Absentees Entry
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
                  <label className={styles.label}>Exam Type</label>
                  <select name="examType" value={formData.examType} onChange={handleInputChange} className={styles.dropdown}>
                    {examTypeOptions.map((opt) => (
                      <option key={opt.value || 'blank'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="">Select</option>
                    {semOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch (GRP)</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="">Select Branch</option>
                    {branchOptions.map((b) => (<option key={b} value={b}>{b}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Paper {loadingPapers && <span className={styles.loadingText}>Loading...</span>}</label>
                  <select name="pCode" value={formData.pCode} onChange={handleInputChange} className={styles.dropdown} disabled={loadingPapers || papers.length === 0}>
                    <option value="">Select Paper</option>
                    {papers.map((p) => (<option key={p.value} value={p.value}>{p.label || p.value}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loadError && !loadingStudents && <div className={styles.errorMessage}>{loadError}</div>}
          {loadingPapers && <div className={styles.loadingMessage}>Loading papers...</div>}
          {loadingStudents && <div className={styles.loadingMessage}>Loading students...</div>}

          {showTable && !loadingStudents ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Reg No.</th>
                    <th>Branch</th>
                    <th>Course Code</th>
                    <th>AB / MP</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.ashid}>
                      <td className={styles.centerText}>{row.regNo}</td>
                      <td className={styles.centerText}>{row.grp}</td>
                      <td className={styles.centerText}>{row.pcode}</td>
                      <td className={styles.centerText}>
                        <input
                          type="text"
                          value={row.midcode}
                          onChange={(e) => handleCodeChange(row.ashid, e.target.value)}
                          onBlur={() => handleCodeBlur(row)}
                          className={styles.tableInput}
                          style={{ textTransform: 'uppercase' }}
                          placeholder="AB/MP"
                          maxLength={2}
                          disabled={savingId === row.ashid}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loadingStudents && !loadError && canLoadPapers ? (
            <div className={styles.noDataMessage}>
              Select Exam Type (Mid 1 or Mid 2) and Paper to load students.
            </div>
          ) : !loadingStudents && !loadError ? (
            <div className={styles.noDataMessage}>
              Set Course, Regulation and Exam Month/Year, then select Semester and Branch to load papers.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MidAbsenteesEntry;
