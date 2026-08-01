import React, { useState, useEffect, useRef } from 'react';
import { FaFlask, FaChevronUp, FaDownload, FaUpload, FaFileExport } from 'react-icons/fa';
import { getAppData } from '../utils/api';
import { getPracticalMarksPapers, getPracticalMarksStudents, savePracticalMarks } from '../utils/api';
import styles from './PracticalMarksEntry.module.css';

const PracticalMarksEntry = () => {
  const [formData, setFormData] = useState({
    semester: '',
    branch: '',
    papers: '',
    pCode: '',
    regNo: '',
    marks: '',
    maxMarks: ''
  });
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [papersOptions, setPapersOptions] = useState([]);
  const [branchOptions] = useState(['Select Branch', 'CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT']);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const semesterOptions = ['Select an Option', '1', '2', '3', '4', '5', '6', '7', '8'];

  const appData = getAppData();
  const regulation = appData?.regulation || '';
  const course = appData?.course || '';
  const examMY = appData?.examMY || '';

  useEffect(() => {
    const sem = formData.semester && formData.semester !== 'Select an Option' ? formData.semester : '';
    const grp = formData.branch && formData.branch !== 'Select Branch' ? formData.branch : '';
    if (!regulation || !examMY || !sem || !course || !grp) { setPapersOptions([]); return; }
    setLoadingPapers(true);
    getPracticalMarksPapers(regulation, examMY, sem, course, grp)
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setPapersOptions(
            res.data.map((p) => {
              const code = p.pcode || p.pCode || p.PCode || p.PCODE || p.code || p.Code || p.value || '';
              const name = p.pName || p.pname || p.PName || p.PNAME || p.name || p.text || code;
              return { value: code, text: name };
            }).filter((p) => p.value)
          );
        } else { setPapersOptions([]); }
      })
      .catch(() => setPapersOptions([]))
      .finally(() => setLoadingPapers(false));
  }, [regulation, examMY, course, formData.semester, formData.branch]);

  useEffect(() => {
    const sem = formData.semester && formData.semester !== 'Select an Option' ? formData.semester : '';
    const grp = formData.branch && formData.branch !== 'Select Branch' ? formData.branch : '';
    const pCode = formData.pCode || (formData.papers ? String(formData.papers).split(' - ')[0] : '');
    if (!regulation || !examMY || !sem || !course || !grp || !pCode) { setTableData([]); setShowTable(false); return; }
    setLoadingStudents(true);
    getPracticalMarksStudents(regulation, examMY, sem, course, grp, pCode)
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          const rows = res.data.map((s, idx) => {
            const ashid = s.aSHID ?? s.ashid ?? s.ASHID ?? s.id ?? idx;
            const pmarks = s.pmarks ?? s.pMarks ?? s.marks ?? s.Marks ?? s.practicalMarks ?? '';
            const pMax = s.pMax != null ? String(s.pMax) : (formData.maxMarks || '100');
            return { id: ashid, ashid, regNo: s.regNo ?? s.RegNo ?? s.REGNO ?? s.htno ?? '', branch: s.grp ?? formData.branch, courseCode: s.pcode ?? s.pCode ?? pCode, practicalMarks: pmarks !== '' && pmarks != null ? String(pmarks) : '', maxMarks: pMax };
          });
          setTableData(rows);
          setShowTable(true);
          const firstMax = rows[0]?.maxMarks;
          if (firstMax) setFormData((prev) => ({ ...prev, maxMarks: firstMax }));
        } else { setTableData([]); setShowTable(false); }
      })
      .catch(() => { setTableData([]); setShowTable(false); })
      .finally(() => setLoadingStudents(false));
  }, [regulation, examMY, course, formData.semester, formData.branch, formData.pCode, formData.papers, formData.maxMarks]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'papers') {
      const pCode = value && value !== 'Select an Option' ? (String(value).indexOf(' - ') >= 0 ? String(value).split(' - ')[0] : value) : '';
      setFormData((prev) => ({ ...prev, papers: value, pCode, maxMarks: value && value !== 'Select an Option' ? '100' : prev.maxMarks }));
    }
    setMessage(null);
  };

  const handleMarksChange = (e) => {
    const { value } = e.target;
    const upper = value.toUpperCase();
    const maxMarks = parseInt(formData.maxMarks) || 0;
    if (upper === 'AB' || upper === 'SM') {
      setFormData((prev) => ({ ...prev, marks: upper }));
      if (formData.regNo.trim()) {
        const targetReg = formData.regNo.trim().toUpperCase();
        setTableData((prev) => prev.map((row) => (row.regNo || '').toString().toUpperCase() === targetReg ? { ...row, practicalMarks: upper } : row));
      }
      return;
    }
    const marks = value === '' ? '' : parseInt(value) || 0;
    if (marks !== '' && marks > maxMarks) { alert('Please enter valid marks'); return; }
    setFormData((prev) => ({ ...prev, marks: value }));
    if (formData.regNo.trim()) {
      const targetReg = formData.regNo.trim().toUpperCase();
      setTableData((prev) => prev.map((row) => (row.regNo || '').toString().toUpperCase() === targetReg ? { ...row, practicalMarks: value } : row));
    }
  };

  const handleTableMarksChange = (rowIndex, value) => {
    const maxMarks = parseInt(tableData[rowIndex]?.maxMarks) || 100;
    if (value !== 'AB' && value !== 'SM') {
      const num = parseInt(value) || 0;
      if (num > maxMarks) return;
    }
    setTableData((prev) => { const next = [...prev]; if (next[rowIndex]) next[rowIndex] = { ...next[rowIndex], practicalMarks: value }; return next; });
    setMessage(null);
  };

  const handleSaveMarks = async () => {
    const toSave = tableData.filter((row) => row.practicalMarks !== '' && row.practicalMarks != null);
    if (toSave.length === 0) { setMessage({ type: 'error', text: 'No marks to save.' }); return; }
    setSaveLoading(true);
    setMessage(null);
    try {
      for (const row of toSave) { await savePracticalMarks(row.ashid, row.practicalMarks); }
      setMessage({ type: 'success', text: 'Practical marks saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save practical marks.' });
    } finally { setSaveLoading(false); }
  };

  const handleDownloadFormat = () => {
    if (!tableData.length) { alert('No students loaded.'); return; }
    const csvLines = [['RegNo', 'Marks'].join(','), ...tableData.map((r) => [r.regNo || '', ''].join(','))];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PracticalMarksFormat_${course}_Sem${formData.semester}_${formData.branch}_${formData.pCode}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!tableData.length) { alert('Load students before importing marks.'); return; }
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  };

  const handleExport = () => {
    if (!tableData.length) { alert('No data to export.'); return; }
    const header = ['RegNo', 'Branch', 'CourseCode', 'PMarks', 'MaxMarks'];
    const rows = tableData.map((row) => [row.regNo || '', row.branch || '', row.courseCode || '', row.practicalMarks != null ? String(row.practicalMarks) : '', row.maxMarks != null ? String(row.maxMarks) : '']);
    const csvLines = [header.join(','), ...rows.map((r) => r.map((v) => { const s = v == null ? '' : String(v); return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s; }).join(','))];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PracticalMarks_${course}_${examMY}_Sem${formData.semester}_${formData.branch}_${formData.pCode}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaFlask className={styles.headerIcon} />
            Practical Marks Entry
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
                  <label className={styles.label}>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className={styles.dropdown}>
                    {semesterOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown}>
                    {branchOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Papers {loadingPapers && <span className={styles.loadingText}>Loading...</span>}</label>
                  <select name="papers" value={formData.papers} onChange={handleInputChange} className={styles.dropdown} disabled={loadingPapers}>
                    <option value="">Select an Option</option>
                    {papersOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.text || opt.value}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Regd.No.</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} className={styles.input} placeholder="Regd.No." style={{ fontWeight: '600', color: '#b91c1c' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Marks</label>
                  <input type="text" name="marks" value={formData.marks} onChange={handleMarksChange} className={styles.input} placeholder="MARKS" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Marks</label>
                  <input type="text" name="maxMarks" value={formData.maxMarks} className={styles.input} placeholder="Max" style={{ fontWeight: '600', color: '#b91c1c' }} readOnly />
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const text = ev.target?.result;
                      if (typeof text !== 'string') return;
                      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
                      if (!lines.length) return;
                      const [headerLine, ...dataLines] = lines;
                      const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
                      const regIdx = headers.indexOf('regno');
                      const marksIdx = headers.indexOf('marks');
                      if (regIdx === -1 || marksIdx === -1) { alert('Invalid format. Expected headers: RegNo, Marks'); return; }
                      const updates = new Map();
                      dataLines.forEach((line) => {
                        const cols = line.split(',');
                        if (cols.length <= Math.max(regIdx, marksIdx)) return;
                        const reg = cols[regIdx].trim().toUpperCase();
                        const marks = cols[marksIdx].trim();
                        if (reg) updates.set(reg, marks);
                      });
                      if (!updates.size) { alert('No data rows found in file.'); return; }
                      setTableData((prev) => prev.map((row) => {
                        const key = (row.regNo || '').toString().toUpperCase();
                        if (!updates.has(key)) return row;
                        const rawMarks = updates.get(key) || '';
                        const upper = rawMarks.toUpperCase();
                        const maxMarks = parseInt(row.maxMarks) || 0;
                        let finalMarks = '';
                        if (upper === 'AB' || upper === 'SM' || upper === '') { finalMarks = upper; }
                        else { const n = parseInt(rawMarks); if (!isNaN(n) && n >= 0 && n <= maxMarks) { finalMarks = String(n); } else { finalMarks = row.practicalMarks ?? ''; } }
                        return { ...row, practicalMarks: finalMarks };
                      }));
                      setMessage({ type: 'success', text: 'Marks imported. Please review and click Save Marks.' });
                    } catch (err) { console.error('Error importing practical marks:', err); alert('Failed to import file.'); }
                  };
                  reader.readAsText(file);
                }}
              />
              <button onClick={handleDownloadFormat} className={styles.downloadBtn}>
                <FaDownload /> Download Format
              </button>
              <button onClick={handleImport} className={styles.importBtn}>
                <FaUpload /> Import
              </button>
              <button onClick={handleExport} className={styles.exportBtn}>
                <FaFileExport /> Export
              </button>
            </div>
          </div>

          {message && (
            <div className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageSuccess}`}>
              {message.text}
            </div>
          )}

          {loadingStudents ? (
            <div className={styles.loadingMessage}>Loading students...</div>
          ) : showTable ? (
            <div className={styles.tableContainer}>
              <div className={styles.saveRow}>
                <button type="button" onClick={handleSaveMarks} disabled={saveLoading || tableData.length === 0} className={styles.uploadBtn}>
                  {saveLoading ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Reg No.</th>
                    <th>Branch</th>
                    <th>Course Code</th>
                    <th>Practical Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td className={styles.centerText}>{item.regNo}</td>
                      <td className={styles.centerText}>{item.branch}</td>
                      <td className={styles.centerText}>{item.courseCode}</td>
                      <td className={styles.centerText}>
                        <input type="text" value={item.practicalMarks} onChange={(e) => handleTableMarksChange(idx, e.target.value)} className={styles.tableInput} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              {regulation && examMY && course
                ? 'Please select Semester, Branch, and Papers to view practical marks data.'
                : 'Please set Regulation, Course, and Exam from the header dropdowns to continue.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticalMarksEntry;
