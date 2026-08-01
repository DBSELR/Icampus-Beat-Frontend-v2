import React, { useState } from 'react';
import { FaQrcode, FaChevronUp, FaFileExport, FaSave } from 'react-icons/fa';
import { getAppData, loadOmrMarks, saveOmrMarks } from '../utils/api';
import styles from './MarksEntryOMR.module.css';

const MarksEntryOMR = () => {
  const [marksType, setMarksType] = useState('Rv');
  const [formData, setFormData] = useState({ semester: '', regNo: '', omrNumber: '', marks: '' });
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const appData = getAppData() || {};

  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadOmrData = async () => {
    const regNo = String(formData.regNo || '').trim();
    if (!regNo) { alert('Please enter Registration Number'); return; }
    const course = (appData.course || '').trim();
    const regulation = (appData.regulation || '').trim();
    const examMY = (appData.examMY || '').trim();
    if (!course || !regulation || !examMY) { alert('Application context missing: please ensure Course, Regulation and Exam Month/Year are set.'); return; }
    const regSup = (appData.regSup ?? '').trim() || undefined;
    try {
      const res = await loadOmrMarks(regNo, course, regulation, examMY, regSup);
      if (!res.success || !res.data || res.data.length === 0) {
        alert(res.message || 'No record found for given OMR number');
        setTableData([]); setShowTable(false); return;
      }
      const rows = res.data.map((row, idx) => ({
        id: row.ASHID ?? row.ashid ?? idx,
        grp: row.GRP ?? row.grp ?? '',
        sem: row.SEM ?? row.sem ?? '',
        tempCode: row.TEMPCODE ?? row.tempCode ?? '',
        pcode: row.PCODE ?? row.pcode ?? '',
        pname: row.PNAME ?? row.pname ?? '',
        omrNumber: row.omrnumber ?? row.OMRNUMBER ?? row.omrNumber ?? '',
        tmarks: row.TMARKS ?? row.tmarks ?? '',
        rvmarks: row.RVMARKS ?? row.rvmarks ?? '',
        v3marks: row.V3 ?? row.V3MARKS ?? row.v3 ?? row.v3marks ?? '',
        exammy: row.exammy ?? row.Exammy ?? examMY,
        ashid: row.ASHID ?? row.ashid ?? 0,
      }));
      setTableData(rows);
      setShowTable(true);
    } catch (err) {
      console.error('Error loading OMR marks:', err);
      alert(err?.message || 'Failed to load OMR data');
      setTableData([]); setShowTable(false);
    }
  };

  const handleSave = async () => {
    if (!String(formData.regNo || '').trim()) { alert('Please enter Registration Number'); return; }
    if (!String(formData.semester || '').trim()) { alert('Please select Semester'); return; }
    if (!String(formData.marks || '').trim()) { alert('Please enter Marks'); return; }
    const omrNumRow = tableData[0];
    const rawOmr = formData.omrNumber || omrNumRow?.omrNumber;
    const numericOmr = typeof rawOmr === 'number' ? rawOmr : parseInt(String(rawOmr || '').trim(), 10);
    if (Number.isNaN(numericOmr) || numericOmr <= 0) { alert('Invalid OMR number. Load data first and use the OMRNUMBER from the grid.'); return; }
    const regulation = (appData.regulation || '').trim();
    const course = (appData.course || '').trim();
    const examMY = (omrNumRow?.exammy || appData.examMY || '').trim();
    if (!regulation || !course || !examMY) { alert('Application context missing: Course, Regulation and Exam Month/Year are required.'); return; }
    try {
      const res = await saveOmrMarks({ regulation, examMY, course, omrNumber: numericOmr, marks: String(formData.marks || '').trim(), type: marksType, sem: String(formData.semester || '').trim() });
      alert(res?.message ?? 'Marks saved successfully!');
      setFormData(prev => ({ ...prev, marks: '' }));
      await loadOmrData();
    } catch (err) {
      console.error('Error saving OMR marks:', err);
      alert(err?.message || 'Failed to save marks');
    }
  };

  const handleExport = () => {
    if (!tableData.length) { alert('No data to export.'); return; }
    const header = ['Branch', 'Sem', 'TempCode', 'PapCode', 'PapName', 'OMRNumber', 'TMarks', 'RVMarks', 'V3Marks'];
    const rows = tableData.map(row => [row.grp || '', row.sem || '', row.tempCode || '', row.pcode || '', row.pname || '', row.omrNumber || '', row.tmarks || '', row.rvmarks || '', row.v3marks || '']);
    const csvLines = [header.join(','), ...rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s; }).join(','))];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OmrMarks_${appData.course || ''}_${appData.examMY || ''}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSave(); };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaQrcode className={styles.headerIcon} />
            Marks Entry (OMR)
          </h2>
          <div className={styles.headerActions}>
            <button onClick={handleExport} className={styles.headerExportBtn}>
              <FaFileExport /> OMR Export
            </button>
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
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="marksType" value="Rv" checked={marksType === 'Rv'} onChange={() => setMarksType('Rv')} /> Rv
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="marksType" value="V3" checked={marksType === 'V3'} onChange={() => setMarksType('V3')} /> V3
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className={styles.select}>
                    <option value="">Select</option>
                    {semesterOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Regd.No</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} onBlur={loadOmrData} className={styles.input} placeholder="Regd.No" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>OMR Number</label>
                  <input type="text" name="omrNumber" value={formData.omrNumber} onChange={handleInputChange} className={styles.input} placeholder="OMR Number" style={{ fontWeight: '600', color: '#b91c1c' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Marks</label>
                  <input type="text" name="marks" value={formData.marks} onChange={handleInputChange} onKeyPress={handleKeyPress} className={styles.input} placeholder="Marks" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
                  <button onClick={handleSave} className={styles.saveBtn}>
                    <FaSave /> Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showTable ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Sem</th>
                    <th>Temp Code</th>
                    <th>Pap Code</th>
                    <th>Pap Name</th>
                    <th>OMR Number</th>
                    <th>TMarks</th>
                    <th>RV Marks</th>
                    <th>V3 Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.centerText}>{row.grp}</td>
                      <td className={styles.centerText}>{row.sem}</td>
                      <td className={styles.centerText}>{row.tempCode}</td>
                      <td className={styles.centerText}>{row.pcode}</td>
                      <td className={styles.centerText}>{row.pname}</td>
                      <td className={styles.centerText}>{row.omrNumber}</td>
                      <td className={styles.centerText}>{row.tmarks}</td>
                      <td className={styles.centerText}>{row.rvmarks}</td>
                      <td className={styles.centerText}>{row.v3marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              Please enter a Registration Number to view marks entry data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksEntryOMR;
