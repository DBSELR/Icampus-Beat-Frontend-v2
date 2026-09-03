import React, { useState } from 'react';
import { FaIdCard, FaChevronUp, FaFileExport, FaSearch } from 'react-icons/fa';
import { getAppData, getRegNoMarksStudent, saveRegNoMarks, getStudentHistoryDetails } from '../utils/api';
import styles from './RegNoWiseMarksEntry.module.css';

const RegNoWiseMarksEntry = () => {
  const [formData, setFormData] = useState({ regNo: '', name: '', sem: '' });
  const [tableData, setTableData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  const appData = getAppData() || {};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegNoBlur = async (e) => {
    const regNo = (e.target.value || '').trim().toUpperCase();
    if (!regNo) return;
    try {
      const res = await getStudentHistoryDetails(regNo);
      
      let student = null;
      if (Array.isArray(res) && res.length > 0) {
        student = res[0];
      } else if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        student = res.data[0];
      } else if (res && !Array.isArray(res) && !res.success) {
        student = res; // flat object
      }

      if (student) {
        const name = student.name || student.Name || student.NAME || student.SName || student.StudentName || student.studentName || '';
        if (name) {
          setFormData(prev => ({ ...prev, name }));
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch name for regNo:', err);
    }
  };

  const loadStudentData = async () => {
    const regNo = formData.regNo.trim().toUpperCase();
    if (!regNo) { alert('Please enter a Registration Number'); return; }
    const semInput = (formData.sem || '').trim();
    if (!semInput) { alert('Please enter SEM (semester) before loading marks.'); return; }
    const examMY = appData.examMY || '';
    const course = appData.course || '';
    let batch = appData.batch || '';
    if (!batch && appData.regulation) { const match = String(appData.regulation).match(/\d+/); if (match) batch = match[0]; }
    if (!examMY || !course || !batch) { alert('Please set Regulation / Course / ExamMY properly before loading marks.'); return; }
    try {
      const res = await getRegNoMarksStudent(regNo, examMY, batch, semInput, course);
      const dto = res.success ? res.data : null;
      if (!dto) {
        alert(res.message || 'No data found for the given RegNo and SEM.');
        setFormData(prev => ({ ...prev, name: '', sem: '' }));
        setTableData([]); setShowTable(false); return;
      }
      const dtoSem = dto.sem || dto.Sem || dto.SEM || semInput;
      setFormData(prev => ({ ...prev, regNo: dto.regNo || dto.RegNo || regNo, name: dto.name || dto.Name || '', sem: dtoSem }));
      const papers = Array.isArray(dto.papers || dto.Papers) ? (dto.papers || dto.Papers) : [];
      const rows = papers.map((p, idx) => ({
        id: p.aSHID || p.ASHID || idx,
        ashid: p.aSHID || p.ASHID,
        examMy: p.Exammy || p.exammy || examMY,
        sem: p.sem || dtoSem,
        courseCode: p.PCode || p.PCODE || p.pcode || '',
        tempCode: p.TempCode || p.TEMPCODE || p.tempCode || '',
        courseName: p.PName || p.PNAME || p.pname || '',
        ptype: p.PTYPE || p.ptype || '',
        sMarks: p.smarks || p.SMARKS || '',
        tMarks: p.TMARKS || p.tmarks || '',
        rvMarks: p.RVMARKS || p.rvmarks || '',
        v3Marks: p.V3 || p.v3 || '',
        finalTMarks: p.MRK_FIN || p.mrK_FIN || p.mrk_fin || '',
        pMarks: p.pmarks || p.PMARKS || ''
      }));
      setTableData(rows);
      setShowTable(rows.length > 0);
    } catch (err) {
      console.error('Error loading regno marks:', err);
      alert(err.message || 'Failed to load student data');
      setTableData([]); setShowTable(false);
    }
  };

  const handleTableInputChange = (id, field, value) => {
    setTableData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleExport = () => alert('OMR Data Export functionality will be implemented here');

  const handleUpdateMarks = () => {
    if (!formData.regNo.trim()) { alert('Please enter a Registration Number'); return; }
    if (tableData.length === 0) { alert('No data to update'); return; }
    const invalidMarks = tableData.some(item => {
      const marks = [item.sMarks, item.tMarks, item.rvMarks, item.v3Marks, item.finalTMarks, item.pMarks];
      return marks.some(mark => { const m = (mark || '').toString().trim().toUpperCase(); if (m === '' || m === 'AB') return false; const num = parseInt(m, 10); return isNaN(num) || num < 0 || num > 100; });
    });
    if (invalidMarks) { alert('Please enter valid marks (0-100 or AB) for all fields'); return; }
    const papersPayload = tableData.map(item => ({
      ASHID: item.ashid || item.id, PTYPE: item.ptype || '', SMARKS: item.sMarks ?? '', TMARKS: item.tMarks ?? '',
      RVMARKS: item.rvMarks ?? '', V3: item.v3Marks ?? '', MRK_FIN: item.finalTMarks ?? '', PMARKS: item.pMarks ?? ''
    }));
    saveRegNoMarks(formData.regNo.trim().toUpperCase(), papersPayload)
      .then(res => alert(res.message || 'Marks updated successfully!'))
      .catch(err => { console.error('Error saving regno marks:', err); alert(err.message || 'Failed to update marks'); });
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaIdCard className={styles.headerIcon} />
            Reg. No. Wise Marks Entry (Sessional &amp; Practical)
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
                <div className={styles.formGroup}>
                  <label className={styles.label}>Registration No.</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} onBlur={handleRegNoBlur} className={styles.input} placeholder="Registration No." style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Student Name</label>
                  <input type="text" name="name" value={formData.name} className={styles.input} placeholder="Name (auto-filled)" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>SEM</label>
                  <input type="text" name="sem" value={formData.sem} onChange={handleInputChange} onBlur={loadStudentData} className={styles.input} placeholder="SEM" style={{ fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }} />
                </div>
                <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
                  <button onClick={loadStudentData} className={styles.getDataBtn}>
                    <FaSearch /> Load Data
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
                    <th>Exam My</th>
                    <th>Sem</th>
                    <th>Course Code</th>
                    <th>Temp Code</th>
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
                  {tableData.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.centerText}>{item.examMy}</td>
                      <td className={styles.centerText}>{item.sem}</td>
                      <td className={styles.centerText}>{item.courseCode}</td>
                      <td className={styles.centerText}>{item.tempCode}</td>
                      <td className={styles.centerText}>{item.courseName}</td>
                      <td className={styles.centerText}><input type="text" value={item.sMarks} onChange={(e) => handleTableInputChange(item.id, 'sMarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={item.tMarks} onChange={(e) => handleTableInputChange(item.id, 'tMarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={item.rvMarks} onChange={(e) => handleTableInputChange(item.id, 'rvMarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={item.v3Marks} onChange={(e) => handleTableInputChange(item.id, 'v3Marks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={item.finalTMarks} onChange={(e) => handleTableInputChange(item.id, 'finalTMarks', e.target.value)} className={styles.tableInput} /></td>
                      <td className={styles.centerText}><input type="text" value={item.pMarks} onChange={(e) => handleTableInputChange(item.id, 'pMarks', e.target.value)} className={styles.tableInput} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.updateButtonContainer}>
                <button onClick={handleUpdateMarks} className={styles.updateBtn}>UPDATE MARKS</button>
              </div>
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              Please enter a Registration Number and SEM to view and update marks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegNoWiseMarksEntry;