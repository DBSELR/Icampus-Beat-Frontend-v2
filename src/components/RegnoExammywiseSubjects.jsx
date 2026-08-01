import React, { useState } from 'react';
import { FaBookOpen, FaChevronUp, FaFileExport, FaSearch, FaSave } from 'react-icons/fa';
import { getAppData, loadRegnoExammywiseSubjectsGet, saveRegnoExammywiseSubjects } from '../utils/api';
import styles from './RegnoExammywiseSubjects.module.css';

const RegnoExammywiseSubjects = () => {
  const appData = getAppData() || {};
  const course = (appData.course || '').trim();
  const regulation = (appData.regulation || '').trim();
  const examMY = (appData.examMY || '').trim();

  const [formData, setFormData] = useState({ regNo: '', name: '', sem: '', semType: 'Reg' });
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'regNo' && !value.trim()) {
      setTableData([]); setShowTable(false);
      setFormData(prev => ({ ...prev, name: '', sem: '' }));
      setLoadError('');
    }
  };

  const handleGetData = async () => {
    const regNo = String(formData.regNo || '').trim().toUpperCase();
    if (!regNo) { alert('Please enter Registration Number'); return; }
    if (!course || !regulation || !examMY) { alert('Application context: select Course, Regulation and Exam Month/Year.'); return; }
    const regSup = formData.semType === 'Sup' ? 'Sup' : 'Reg';
    setLoading(true); setLoadError('');
    try {
      const res = await loadRegnoExammywiseSubjectsGet(regNo, course, regulation, examMY, regSup);
      if (!res.success || !res.data) {
        setTableData([]); setShowTable(false);
        setLoadError(res.message || 'No subjects found'); return;
      }
      const rows = (res.data || []).map((row) => ({
        ashid: row.aSHID ?? row.ASHID ?? row.ashid ?? 0,
        ptype: row.PTYPE ?? row.ptype ?? '',
        exammy: row.Exammy ?? row.exammy ?? '',
        sem: row.sem ?? row.SEM ?? '',
        pcode: row.PCode ?? row.pcode ?? '',
        tempCode: row.TempCode ?? row.tempCode ?? '',
        pname: row.PName ?? row.pname ?? '',
        smarks: row.smarks ?? row.SMARKS ?? '',
        tmarks: row.TMARKS ?? row.tmarks ?? '',
        rvmarks: row.RVMARKS ?? row.rvmarks ?? '',
        v3: row.V3 ?? row.v3 ?? '',
        mrK_FIN: row.MRK_FIN ?? row.mrK_FIN ?? row.mrk_fin ?? '',
        pmarks: row.pmarks ?? row.PMARKS ?? ''
      }));
      setTableData(rows);
      setShowTable(rows.length > 0);
      if (rows.length > 0) { const first = rows[0]; setFormData(prev => ({ ...prev, sem: first.sem || prev.sem })); }
      if (rows.length === 0) setLoadError(res.message || 'No subjects found');
    } catch (err) {
      console.error('RegnoExammywiseSubjects load-get error:', err);
      setTableData([]); setShowTable(false);
      setLoadError(err?.message || 'Failed to load data');
    } finally { setLoading(false); }
  };

  const handleTableInputChange = (ashid, field, value) => {
    setTableData(prev => prev.map(item => item.ashid === ashid ? { ...item, [field]: value } : item));
  };

  const handleUpdateMarks = async () => {
    const regNo = String(formData.regNo || '').trim().toUpperCase();
    if (!regNo) { alert('Please enter Registration Number'); return; }
    if (tableData.length === 0) { alert('No data to update'); return; }
    const papers = tableData.map((p) => ({
      ashid: p.ashid, smarks: p.smarks ?? '', pmarks: p.pmarks ?? '',
      tmarks: p.tmarks ?? '', rvmarks: p.rvmarks ?? '', v3: p.v3 ?? '', mrK_FIN: p.mrK_FIN ?? ''
    }));
    try {
      const res = await saveRegnoExammywiseSubjects(regNo, papers);
      alert(res?.message ?? 'Marks updated.');
    } catch (err) { console.error('Save error:', err); alert(err?.message || 'Failed to update marks'); }
  };

  const handleExport = () => {
    const regNo = String(formData.regNo || '').trim().toUpperCase();
    if (!regNo) { alert('Please enter Registration Number'); return; }
    if (tableData.length === 0) { alert('No data to export'); return; }
    const header = ['Exam My', 'Sem', 'Course Code', 'TempCode', 'Course Name', 'SMARKS', 'TMARKS', 'RV MARKS', 'V3 MARKS', 'Final Tmarks', 'PMARKS'];
    const rows = tableData.map((p) => [p.exammy ?? '', p.sem ?? '', p.pcode ?? '', p.tempCode ?? '', p.pname ?? '', p.smarks ?? '', p.tmarks ?? '', p.rvmarks ?? '', p.v3 ?? '', p.mrK_FIN ?? '', p.pmarks ?? '']);
    const csvLines = [header.join(','), ...rows.map((r) => r.map((v) => (String(v ?? '').includes(',') ? `"${String(v).replace(/"/g, '""')}"` : (v ?? ''))).join(','))];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `RegnoExammywise_${regNo}_${examMY || 'export'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaBookOpen className={styles.headerIcon} />
            Reg. No. &amp; Exammy Wise Subjects Entry
          </h2>
          <div className={styles.headerActions}>
            <button onClick={handleExport} className={styles.headerExportBtn}>
              <FaFileExport /> Export
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
                <div className={styles.formGroup}>
                  <label className={styles.label}>Registration No.</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} className={styles.input} placeholder="Registration No." style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Student Name</label>
                  <input type="text" name="name" value={formData.name} className={styles.input} placeholder="Auto-filled" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>SEM</label>
                  <input type="text" name="sem" value={formData.sem} className={styles.input} placeholder="SEM" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sem Type</label>
                  <select name="semType" value={formData.semType} onChange={handleInputChange} className={styles.dropdown}>
                    <option value="Reg">Reg</option>
                    <option value="Sup">Sup</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
                  <button type="button" onClick={handleGetData} className={styles.getDataBtn} disabled={loading}>
                    <FaSearch /> {loading ? 'Loading...' : 'Get Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loadError && !loading && <div className={styles.errorMessage}>{loadError}</div>}

          {showTable && !loading ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Exam My</th>
                    <th>Sem</th>
                    <th>Course Code</th>
                    <th>TempCode</th>
                    <th>Course Name</th>
                    <th>SMARKS</th>
                    <th>TMARKS</th>
                    <th>RV MARKS</th>
                    <th>V3 MARKS</th>
                    <th>Final Tmarks</th>
                    <th>PMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.ashid}>
                      <td className={styles.centerText}>{row.exammy}</td>
                      <td className={styles.centerText}>{row.sem}</td>
                      <td className={styles.centerText}>{row.pcode}</td>
                      <td className={styles.centerText}>{row.tempCode}</td>
                      <td className={styles.centerText}>{row.pname}</td>
                      <td className={styles.centerText}><input type="text" value={row.smarks} onChange={(e) => handleTableInputChange(row.ashid, 'smarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={row.tmarks} onChange={(e) => handleTableInputChange(row.ashid, 'tmarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={row.rvmarks} onChange={(e) => handleTableInputChange(row.ashid, 'rvmarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={row.v3} onChange={(e) => handleTableInputChange(row.ashid, 'v3', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={row.mrK_FIN} onChange={(e) => handleTableInputChange(row.ashid, 'mrK_FIN', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={row.pmarks} onChange={(e) => handleTableInputChange(row.ashid, 'pmarks', e.target.value)} className={styles.tableInput} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.updateButtonContainer}>
                <button type="button" onClick={handleUpdateMarks} className={styles.updateBtn}>
                  <FaSave /> UPDATE MARKS
                </button>
              </div>
            </div>
          ) : !loading && !loadError ? (
            <div className={styles.noDataMessage}>
              Enter Registration Number, select Sem Type (Reg/Sup), and click Get Data. Ensure Course, Regulation and Exam Month/Year are set.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RegnoExammywiseSubjects;
