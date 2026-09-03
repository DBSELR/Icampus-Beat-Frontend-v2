import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaChevronUp, FaDownload, FaUpload, FaFileExport } from 'react-icons/fa';
import { getAppData } from '../utils/api';
import { getInternalMarksPapers, getInternalMarksStudents, saveInternalMarks } from '../utils/api';
import styles from './InternalMarksEntry.module.css';

const InternalMarksEntry = () => {
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

  const semesterOptions = ['Select an Option', '1', '2', '3', '4', '5', '6', '7', '8'];

  const appData = getAppData();
  const regulation = appData?.regulation || '';
  const course = appData?.course || '';
  const examMY = appData?.examMY || '';

  useEffect(() => {
    const sem = formData.semester && formData.semester !== 'Select an Option' ? formData.semester : '';
    const grp = formData.branch && formData.branch !== 'Select Branch' ? formData.branch : '';
    if (!regulation || !examMY || !sem || !course || !grp) {
      setPapersOptions([]);
      return;
    }
    setLoadingPapers(true);
    getInternalMarksPapers(regulation, examMY, sem, course, grp)
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setPapersOptions(
            res.data
              .map((p) => {
                const code = p.pcode || p.pCode || p.PCode || p.PCODE || p.code || p.Code || p.value || '';
                const name = p.pName || p.pname || p.PName || p.PNAME || p.name || p.text || code;
                return { value: code, text: name };
              })
              .filter((p) => p.value)
          );
        } else {
          setPapersOptions([]);
        }
      })
      .catch(() => setPapersOptions([]))
      .finally(() => setLoadingPapers(false));
  }, [regulation, examMY, course, formData.semester, formData.branch]);

  useEffect(() => {
    const sem = formData.semester && formData.semester !== 'Select an Option' ? formData.semester : '';
    const grp = formData.branch && formData.branch !== 'Select Branch' ? formData.branch : '';
    const pCode = formData.pCode || (formData.papers ? formData.papers.split(' - ')[0] : '');
    if (!regulation || !examMY || !sem || !course || !grp || !pCode) {
      setTableData([]);
      setShowTable(false);
      return;
    }
    setLoadingStudents(true);
    getInternalMarksStudents(regulation, examMY, sem, course, grp, pCode)
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          const rows = res.data.map((s, idx) => {
            const smarks = s.smarks ?? s.SMARKS ?? s.marks ?? s.Marks ?? s.sessionMarks ?? '';
            const smax = (s.smax ?? s.SMAX ?? s.maxMarks ?? s.MaxMarks ?? formData.maxMarks) || '100';
            return {
              id: s.ashid ?? s.ASHID ?? s.Ashid ?? s.ASH_ID ?? s.id ?? s.Id ?? s.ID ?? idx,
              ashid: s.ashid ?? s.ASHID ?? s.Ashid ?? s.ASH_ID ?? s.id ?? s.Id ?? s.ID ?? idx,
              regNo: s.regNo ?? s.RegNo ?? s.REGNO ?? s.htno ?? '',
              branch: formData.branch,
              courseCode: pCode,
              sessionMarks: smarks !== '' && smarks != null ? String(smarks) : '',
              maxMarks: String(smax),
            };
          });
          setTableData(rows);
          setShowTable(true);
          const firstMax = rows[0]?.maxMarks;
          if (firstMax) {
            setFormData((prev) => ({ ...prev, maxMarks: firstMax }));
          }
        } else {
          setTableData([]);
          setShowTable(false);
        }
      })
      .catch(() => {
        setTableData([]);
        setShowTable(false);
      })
      .finally(() => setLoadingStudents(false));
  }, [regulation, examMY, course, formData.semester, formData.branch, formData.pCode, formData.papers, formData.maxMarks]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'papers') {
      const pCode = value && value !== 'Select an Option' ? (value.indexOf(' - ') >= 0 ? value.split(' - ')[0] : value) : '';
      setFormData(prev => ({ ...prev, papers: value, pCode, maxMarks: value && value !== 'Select an Option' ? '100' : prev.maxMarks }));
    }
    setMessage(null);
  };

  const handleMarksChange = (e) => {
    const { value } = e.target;
    const upper = String(value || '').toUpperCase();
    const maxMarks = parseInt(formData.maxMarks) || 0;
    if (upper === 'AB' || upper === 'SM') {
      setFormData((prev) => ({ ...prev, marks: upper }));
      if (formData.regNo.trim()) {
        const targetReg = formData.regNo.trim().toUpperCase();
        setTableData((prev) => prev.map((row) => (row.regNo || '').toString().toUpperCase() === targetReg ? { ...row, sessionMarks: upper } : row));
      }
      return;
    }
    const marks = value === '' ? '' : parseInt(value) || 0;
    if (marks !== '' && marks > maxMarks) { alert('Marks cannot exceed maximum marks'); return; }
    setFormData((prev) => ({ ...prev, marks: value }));
    if (formData.regNo.trim()) {
      const targetReg = formData.regNo.trim().toUpperCase();
      setTableData((prev) => prev.map((row) => (row.regNo || '').toString().toUpperCase() === targetReg ? { ...row, sessionMarks: value } : row));
    }
  };

  const handleTableMarksChange = (rowIndex, value) => {
    const maxMarks = parseInt(tableData[rowIndex]?.maxMarks) || 100;
    const num = parseInt(value) || 0;
    if (num > maxMarks) return;
    setTableData(prev => {
      const next = [...prev];
      if (next[rowIndex]) next[rowIndex] = { ...next[rowIndex], sessionMarks: value };
      return next;
    });
    setMessage(null);
  };

  const handleSaveMarks = async () => {
    const toSave = tableData.filter((row) => row.sessionMarks !== '' && row.sessionMarks != null);
    if (toSave.length === 0) { setMessage({ type: 'error', text: 'No marks to save.' }); return; }
    setSaveLoading(true);
    setMessage(null);
    try {
      for (const row of toSave) { await saveInternalMarks(row.ashid, row.sessionMarks); }
      setMessage({ type: 'success', text: 'Marks saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save marks.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownloadFormat = () => {
    const csvContent = "data:text/csv;charset=utf-8,Reg No.,Session Marks\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Marks_Format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleUploadToICampus = () => alert('Upload to iCampus functionality will be implemented here');
  
  const handleExport = () => {
    if (tableData.length === 0) {
      alert('No data to export.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Reg No.,Branch,Course Code,Session Marks\n";
    tableData.forEach(row => {
      csvContent += `${row.regNo},${row.branch},${row.courseCode},${row.sessionMarks}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Internal_Marks_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadInternalData = () => {
    handleExport(); // For now, just alias to Export since we have the data
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaClipboardList className={styles.headerIcon} />
            Sessional Marks Entry
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
                    {semesterOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch</label>
                  <select name="branch" value={formData.branch} onChange={handleInputChange} className={styles.dropdown}>
                    {branchOptions.map(option => (<option key={option} value={option}>{option}</option>))}
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
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} className={styles.input} placeholder="Regd.No." />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Marks</label>
                  <input type="text" name="marks" value={formData.marks} onChange={handleMarksChange} className={styles.input} placeholder="MARKS" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Marks</label>
                  <input type="text" name="maxMarks" value={formData.maxMarks} onChange={handleInputChange} className={styles.input} placeholder="Max" readOnly />
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button onClick={handleDownloadInternalData} className={styles.downloadBtn}>
                <FaDownload /> Download Internal Data
              </button>
              <button onClick={handleDownloadFormat} className={styles.downloadBtn}>
                <FaDownload /> Download Format
              </button>
              <button onClick={handleUploadToICampus} className={styles.uploadBtn}>
                <FaUpload /> Upload to iCampus
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
                    <th>Session Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td className={styles.centerText}>{item.regNo}</td>
                      <td className={styles.centerText}>{item.branch}</td>
                      <td className={styles.centerText}>{item.courseCode}</td>
                      <td className={styles.centerText}>
                        <input
                          type="text"
                          value={item.sessionMarks}
                          onChange={(e) => handleTableMarksChange(idx, e.target.value)}
                          className={styles.tableInput}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              {regulation && examMY && course
                ? 'Please select Semester, Branch, and Papers to view session marks data.'
                : 'Please set Regulation, Course, and Exam from the header dropdowns to continue.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternalMarksEntry;