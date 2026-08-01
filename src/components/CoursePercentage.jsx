import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getAppData, getCoursePercentageSems, getCoursePercentageData } from '../utils/api';
import styles from './CoursePercentage.module.css';

const CoursePercentage = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [semester, setSemester]     = useState('');
  const [chkRv, setChkRv]           = useState(false);
  const [chkSup, setChkSup]         = useState(false);
  const [semOptions, setSemOptions] = useState([]);
  const [tableData, setTableData]   = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY) return;
    getCoursePercentageSems(course, examMY)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!semester) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getCoursePercentageData(course, examMY, regu, semester, chkSup, chkRv);
      if (res.success && res.data && res.data.length > 0) {
        setTableData(res.data);
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'View failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSemester(''); setChkRv(false); setChkSup(false);
    setTableData([]);
    setMessage({ text: '', type: '' });
  };

  const getVal = (obj, keys) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    for (const key of keys) {
      const match = objKeys.find((k) => k.toLowerCase() === key.toLowerCase());
      if (match && obj[match] != null && String(obj[match]).trim() !== '') {
        return String(obj[match]).trim();
      }
    }
    return '';
  };

  const processReportData = useCallback(() => {
    if (!tableData || tableData.length === 0) return [];

    return tableData.map((row, idx) => {
      const subjectCode = getVal(row, ['PCODE', 'SUBJECTCODE', 'PAPERCODE', 'SUBCODE', 'SUBJECT_CODE']);
      const subjectName = getVal(row, ['PNAME', 'SUBJECTNAME', 'SUBNAME', 'SUBJECT', 'PAPERNAME']);
      const appeared = getVal(row, ['APPEARED', 'APP', 'TOTAL_APP']);
      const passed = getVal(row, ['PASSED', 'PASS', 'TOTAL_PASS']);
      let percentage = getVal(row, ['PERCENTAGE', 'PERCENT', '%', 'PASS_PERCENTAGE']);

      if (!percentage && appeared && passed && Number(appeared) > 0) {
        percentage = ((Number(passed) / Number(appeared)) * 100).toFixed(2);
      } else if (percentage && !isNaN(Number(percentage))) {
        percentage = Number(percentage).toFixed(2);
      }

      return {
        sno: idx + 1,
        courseCodeName: `${subjectCode ? subjectCode + '-' : ''}${subjectName}`,
        appeared: appeared || '0',
        passed: passed || '0',
        percentage: percentage || '0.00'
      };
    });
  }, [tableData]);

  const handleDownloadPDF = async () => {
    const data = processReportData();
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }

    let logoData = null;
    try {
      const response = await fetch('/assets/Screenshot%202026-06-18%20143601.png');
      const blob = await response.blob();
      logoData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not load logo for PDF', err);
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      let currentY = margin;

      // Header
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, currentY, 35, 30);
      }

      const centerW = pageWidth / 2;
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.text('D. B. S. Institute', centerW, currentY + 12, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('times', 'normal');
      doc.text('(PVT.LTD)', centerW, currentY + 18, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('times', 'bold');
      doc.text('Results Analysis (Before RV/SM/GR)', centerW, currentY + 30, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text('Course wise Pass Percentage List', centerW, currentY + 40, { align: 'center' });
      
      currentY += 52;

      // Meta Row
      doc.setFontSize(12);
      doc.setFont('times', 'normal');
      doc.text(`Programme : ${course}`, margin, currentY);
      doc.text(`Exam Month & Year : ${examMY}`, pageWidth - margin, currentY, { align: 'right' });
      
      currentY += 5;

      // Table Headers
      const colWidths = [15, 105, 25, 20, 15];
      const startX = margin;
      
      doc.setDrawColor(211, 211, 211); // light gray
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.3);

      doc.rect(startX, currentY, pageWidth - 2 * margin, 8, 'FD');
      
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      
      doc.text('S.No.', startX + colWidths[0]/2, currentY + 5.5, { align: 'center' });
      doc.text('COURSE CODE AND NAME', startX + colWidths[0] + colWidths[1]/2, currentY + 5.5, { align: 'center' });
      doc.text('APPEARED', startX + colWidths[0] + colWidths[1] + colWidths[2]/2, currentY + 5.5, { align: 'center' });
      doc.text('PASSED', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, currentY + 5.5, { align: 'center' });
      doc.text('%', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2, currentY + 5.5, { align: 'center' });

      // Vertical lines for header
      let currX = startX;
      for (let i = 0; i < colWidths.length - 1; i++) {
        currX += colWidths[i];
        doc.line(currX, currentY, currX, currentY + 8);
      }

      currentY += 8;
      
      // Table Data
      doc.setFont('times', 'normal');
      data.forEach(row => {
        if (currentY > 260) {
            // Footer on current page
            currentY = 280;
            doc.setFont('times', 'bold');
            doc.text('Controller of Examinations', margin, currentY);
            doc.text('JNTUH Nominee', pageWidth / 2, currentY, { align: 'center' });
            doc.text('Principal', pageWidth - margin, currentY, { align: 'right' });
            
            doc.addPage();
            currentY = margin;
            
            // Re-draw headers
            doc.setDrawColor(211, 211, 211);
            doc.rect(startX, currentY, pageWidth - 2 * margin, 8, 'FD');
            doc.setFont('times', 'bold');
            doc.text('S.No.', startX + colWidths[0]/2, currentY + 5.5, { align: 'center' });
            doc.text('COURSE CODE AND NAME', startX + colWidths[0] + colWidths[1]/2, currentY + 5.5, { align: 'center' });
            doc.text('APPEARED', startX + colWidths[0] + colWidths[1] + colWidths[2]/2, currentY + 5.5, { align: 'center' });
            doc.text('PASSED', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, currentY + 5.5, { align: 'center' });
            doc.text('%', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2, currentY + 5.5, { align: 'center' });

            let currX = startX;
            for (let i = 0; i < colWidths.length - 1; i++) {
              currX += colWidths[i];
              doc.line(currX, currentY, currX, currentY + 8);
            }
            currentY += 8;
            doc.setFont('times', 'normal');
        }
        
        doc.rect(startX, currentY, pageWidth - 2 * margin, 8, 'S');
        
        doc.text(String(row.sno), startX + colWidths[0]/2, currentY + 5.5, { align: 'center' });
        
        // Truncate course name if needed based on measured text width
        let cName = row.courseCodeName;
        let maxWidth = colWidths[1] - 4; // 101mm
        if (doc.getTextWidth(cName) > maxWidth) {
          while (doc.getTextWidth(cName + '...') > maxWidth && cName.length > 0) {
            cName = cName.substring(0, cName.length - 1);
          }
          cName += '...';
        }
        doc.text(cName, startX + colWidths[0] + 2, currentY + 5.5);
        
        doc.text(String(row.appeared), startX + colWidths[0] + colWidths[1] + colWidths[2]/2, currentY + 5.5, { align: 'center' });
        doc.text(String(row.passed), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, currentY + 5.5, { align: 'center' });
        
        doc.setFont('times', 'bold');
        doc.text(String(row.percentage), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2, currentY + 5.5, { align: 'center' });
        doc.setFont('times', 'normal');

        // Vertical lines for row
        let rowX = startX;
        for (let i = 0; i < colWidths.length - 1; i++) {
          rowX += colWidths[i];
          doc.line(rowX, currentY, rowX, currentY + 8);
        }
        
        currentY += 8;
      });
      
      // Footer on last page
      const footerY = Math.max(currentY + 20, 280);
      doc.setFont('times', 'bold');
      doc.text('Controller of Examinations', margin, footerY);
      doc.text('JNTUH Nominee', pageWidth / 2, footerY, { align: 'center' });
      doc.text('Principal', pageWidth - margin, footerY, { align: 'right' });

      doc.save(`CoursePercentage_${course}_${examMY}_${semester}.pdf`);
    } catch (err) {
      console.error('Error exporting Course Percentage pdf:', err);
      alert(err.message || 'Failed to export Course Percentage pdf');
    }
  };

  const displayData = processReportData();

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)} className={styles.select}>
              <option value=''>Select</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={chkRv} onChange={e => setChkRv(e.target.checked)} />
              RV
            </label>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={chkSup} onChange={e => setChkSup(e.target.checked)} />
              Sup
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleClear} style={{ marginLeft: 8 }}>
              Clear
            </button>
            {tableData.length > 0 && (
              <button type='button' className={styles.downloadBtn} onClick={handleDownloadPDF} style={{ marginLeft: 8 }}>
                Download PDF
              </button>
            )}
          </div>
        </div>

        {message.text && (
          <div style={{
            margin: '8px 0', padding: '6px 12px', borderRadius: 4, fontWeight: 'bold',
            color: message.type === 'success' ? '#155724' : '#721c24',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>{message.text}</div>
        )}
      </div>

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div style={{color: '#6c757d', fontSize: '14px', textAlign: 'center'}}>Select Semester and click View to load the report.</div>
        )}

        {displayData.length > 0 && (
          <div className={styles.reportContent}>
            <div className={styles.abstractReportPage}>
              <div className={styles.reportHeader}>
                <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                <div className={styles.headerText}>
                  <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                  <p className={styles.ugcText}>(PVT.LTD)</p>
                </div>
              </div>
              
              <h3 className={styles.reportTitle}>Results Analysis (Before RV/SM/GR)</h3>
              <h3 className={styles.subTitle}>Course wise Pass Percentage List</h3>

              <div className={styles.metaRow}>
                <div>Programme : {course}</div>
                <div>Exam Month & Year : {examMY}</div>
              </div>

              <table className={styles.styledTable}>
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>S.No.</th>
                    <th style={{ width: '60%' }}>COURSE CODE AND NAME</th>
                    <th style={{ width: '12%' }}>APPEARED</th>
                    <th style={{ width: '10%' }}>PASSED</th>
                    <th style={{ width: '10%' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, i) => (
                    <tr key={i}>
                      <td>{row.sno}</td>
                      <td className={styles.leftAlign}>{row.courseCodeName}</td>
                      <td>{row.appeared}</td>
                      <td>{row.passed}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.footerSignatures} style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', width: 'auto' }}>
                <span className={styles.sigBlock}>Controller of Examinations</span>
                <span className={styles.sigBlock}>JNTUH Nominee</span>
                <span className={styles.sigBlock}>Principal</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePercentage;
