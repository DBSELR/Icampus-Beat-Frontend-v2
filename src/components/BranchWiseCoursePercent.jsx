import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import styles from './BranchWiseCoursePercent.module.css';
import {
  getAppData,
  getBranchwiseCoursePercentSems,
  getBranchwiseCoursePercentData,
  getBranchwiseCourseSecPercentSems,
  getBranchwiseCourseSecPercentData,
} from '../utils/api';

const TABS = [
  { key: 'percent',    label: 'Branch-wise Course Percent'     },
  { key: 'secpercent', label: 'Branch-wise Course Sec Percent' },
];

const BranchWiseCoursePercent = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [activeTab, setActiveTab] = useState('percent');

  // Tab 1
  const [p_sem, setP_sem]       = useState('');
  const [p_isSup, setP_isSup]   = useState(false);
  const [p_isRv, setP_isRv]     = useState(false);
  const [p_semOpts, setP_semOpts] = useState([]);

  // Tab 2
  const [s_sem, setS_sem]       = useState('');
  const [s_isRv, setS_isRv]     = useState(false);
  const [s_semOpts, setS_semOpts] = useState([]);

  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const clearTable = () => { setTableData([]); };

  useEffect(() => {
    if (!course || !examMY) return;
    Promise.all([
      getBranchwiseCoursePercentSems(course, examMY),
      getBranchwiseCourseSecPercentSems(course, examMY),
    ]).then(([r1, r2]) => {
      if (r1.success && r1.data)
        setP_semOpts(r1.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      if (r2.success && r2.data)
        setS_semOpts(r2.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
    }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (activeTab === 'percent') {
      if (!p_sem) { showMsg('Please select Semester.'); return; }
      setIsLoading(true); clearTable();
      try {
        const res = await getBranchwiseCoursePercentData(course, examMY, regu, p_sem, p_isSup);
        if (res.success && res.data && res.data.length > 0) {
          setTableData(res.data);
          showMsg(`${res.data.length} records loaded.`, 'success');
        } else {
          showMsg(res.message || 'No data found.');
        }
      } catch (err) { showMsg(err.message || 'View failed.'); } finally { setIsLoading(false); }
    } else {
      if (!s_sem) { showMsg('Please select Semester.'); return; }
      setIsLoading(true); clearTable();
      try {
        const res = await getBranchwiseCourseSecPercentData(course, examMY, regu, s_sem, s_isRv);
        if (res.success && res.data && res.data.length > 0) {
          setTableData(res.data);
          showMsg(`${res.data.length} records loaded.`, 'success');
        } else {
          showMsg(res.message || 'No data found.');
        }
      } catch (err) { showMsg(err.message || 'View failed.'); } finally { setIsLoading(false); }
    }
  };

  const handleClear = () => {
    setP_sem(''); setP_isSup(false); setP_isRv(false);
    setS_sem(''); setS_isRv(false);
    clearTable();
    setMessage({ text: '', type: '' });
  };

  const tabStyle = (key) => ({
    padding: '6px 14px', marginRight: 4, cursor: 'pointer', fontSize: 13,
    border: '1px solid #ccc', borderBottom: activeTab === key ? '1px solid #fff' : '1px solid #ccc',
    background: activeTab === key ? '#fff' : '#f5f5f5', fontWeight: activeTab === key ? 'bold' : 'normal',
    borderRadius: '4px 4px 0 0',
  });

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
      const subjectCode = getVal(row, ['PCODE', 'SUBJECTCODE', 'PAPERCODE', 'SUBCODE', 'SUBJECT_CODE', 'COURSECODE']);
      const subjectName = getVal(row, ['PNAME', 'SUBJECTNAME', 'SUBNAME', 'SUBJECT', 'PAPERNAME', 'COURSENAME']);
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
    if (data.length === 0) { alert('No data to export.'); return; }

    let logoData = null;
    try {
      const response = await fetch('/assets/Screenshot%202026-06-18%20143601.png');
      const blob = await response.blob();
      logoData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) { console.warn('Could not load logo for PDF', err); }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      
      const drawOuterBorder = () => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'S');
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('Controller of Examinations', pageWidth - margin - 5, pageHeight - margin - 5, { align: 'right' });
      };

      const drawHeader = (startY) => {
        if (logoData) {
          doc.addImage(logoData, 'PNG', startY + 5, startY + 5, 35, 30);
        }
        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.text('D. B. S. Institute', centerW, startY + 12, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text('(PVT.LTD)', centerW, startY + 18, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('Office of the Controller of Examinations', centerW, startY + 34, { align: 'center' });
        
        let headerH = startY + 48;
        
        // Table Headers
        const colWidths = [15, 105, 25, 20, 15];
        const startX = margin + 5;
        doc.setDrawColor(211, 211, 211);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.rect(startX, headerH, pageWidth - 2 * startX, 8, 'FD');
        
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('S.No.', startX + colWidths[0]/2, headerH + 5.5, { align: 'center' });
        doc.text('SUBJECT CODE AND NAME', startX + colWidths[0] + colWidths[1]/2, headerH + 5.5, { align: 'center' });
        doc.text('APPEARED', startX + colWidths[0] + colWidths[1] + colWidths[2]/2, headerH + 5.5, { align: 'center' });
        doc.text('PASSED', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, headerH + 5.5, { align: 'center' });
        doc.text('%', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2, headerH + 5.5, { align: 'center' });

        let currX = startX;
        for (let i = 0; i < colWidths.length - 1; i++) {
          currX += colWidths[i];
          doc.line(currX, headerH, currX, headerH + 8);
        }
        return headerH + 8;
      };

      let currentY = margin;
      drawOuterBorder();
      currentY = drawHeader(currentY);
      
      const startX = margin + 5;
      const colWidths = [15, 105, 25, 20, 15];

      doc.setFont('times', 'normal');
      data.forEach(row => {
        if (currentY > pageHeight - margin - 25) {
            doc.addPage();
            currentY = margin;
            drawOuterBorder();
            currentY = drawHeader(currentY);
            doc.setFont('times', 'normal');
        }
        
        doc.setDrawColor(211, 211, 211);
        doc.rect(startX, currentY, pageWidth - 2 * startX, 8, 'S');
        
        doc.text(String(row.sno), startX + colWidths[0]/2, currentY + 5.5, { align: 'center' });
        
        let cName = row.courseCodeName;
        let maxWidth = colWidths[1] - 4;
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

        let rowX = startX;
        for (let i = 0; i < colWidths.length - 1; i++) {
          rowX += colWidths[i];
          doc.line(rowX, currentY, rowX, currentY + 8);
        }
        
        currentY += 8;
      });
      
      const fileNameStr = activeTab === 'percent' ? 'Percent' : 'SecPercent';
      doc.save(`BranchWiseCourse_${fileNameStr}_${course}_${examMY}.pdf`);
    } catch (err) {
      console.error('Error exporting BranchWiseCoursePercent pdf:', err);
      alert(err.message || 'Failed to export pdf');
    }
  };

  const displayData = processReportData();

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: 14 }}>
          {TABS.map(t => (
            <div key={t.key} style={tabStyle(t.key)}
              onClick={() => { setActiveTab(t.key); clearTable(); setMessage({ text: '', type: '' }); }}>
              {t.label}
            </div>
          ))}
        </div>

        {message.text && (
          <div style={{
            margin: '6px 0 10px', padding: '6px 12px', borderRadius: 4, fontWeight: 'bold',
            color: message.type === 'success' ? '#155724' : '#721c24',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>{message.text}</div>
        )}

        <div className={styles.filtersRow}>
          {activeTab === 'percent' && (<>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Semester</label>
              <select value={p_sem} onChange={e => setP_sem(e.target.value)} className={styles.select}>
                <option value=''>Select</option>
                {p_semOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.checkGroup}>
              <label className={styles.checkLabel}>
                <input type='checkbox' checked={p_isRv} onChange={e => setP_isRv(e.target.checked)} />
                &nbsp;RV
              </label>
            </div>
            <div className={styles.checkGroup}>
              <label className={styles.checkLabel}>
                <input type='checkbox' checked={p_isSup} onChange={e => setP_isSup(e.target.checked)} />
                &nbsp;Supply
              </label>
            </div>
          </>)}

          {activeTab === 'secpercent' && (<>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Semester</label>
              <select value={s_sem} onChange={e => setS_sem(e.target.value)} className={styles.select}>
                <option value=''>Select</option>
                {s_semOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.checkGroup}>
              <label className={styles.checkLabel}>
                <input type='checkbox' checked={s_isRv} onChange={e => setS_isRv(e.target.checked)} />
                &nbsp;RV
              </label>
            </div>
          </>)}

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
      </div>

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div style={{color: '#6c757d', fontSize: '14px', textAlign: 'center'}}>Select Semester and click View to load data.</div>
        )}

        {displayData.length > 0 && (
          <div className={styles.reportContent}>
            <div className={styles.abstractReportPage}>
              <div className={styles.pageBorder}>
                <div className={styles.reportHeader}>
                  <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                  <div className={styles.headerText}>
                    <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                    <p className={styles.ugcText}>(PVT.LTD)</p>
                  </div>
                </div>
                
                <h3 className={styles.subTitle}>Office of the Controller of Examinations</h3>

                <table className={styles.styledTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No.</th>
                      <th style={{ width: '60%' }}>SUBJECT CODE AND NAME</th>
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

                <div className={styles.footerSignatures}>
                  <span className={styles.sigBlock}>Controller of Examinations</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchWiseCoursePercent;
