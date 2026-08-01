import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import styles from './PassedResult.module.css';
import { getAppData, getPassedResultSems, getPassedResultData } from '../utils/api';

const PassedResult = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [semester, setSemester]     = useState('');
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
    getPassedResultSems(course, examMY, regu)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.sem || r.Sem || r)));
      }).catch(() => {});
  }, [course, examMY, regu]);

  useEffect(() => {
    if (!semester || !course || !examMY) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    getPassedResultData(course, examMY, regu, semester)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setTableData(res.data);
          showMsg(`${res.data.length} records loaded.`, 'success');
        } else {
          showMsg(res.message || 'No data found.');
        }
      })
      .catch(err => showMsg(err.message || 'Load failed.'))
      .finally(() => setIsLoading(false));
  }, [semester]);

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
    
    const grouped = {};
    tableData.forEach(row => {
      const branchName = getVal(row, ['BRANCH', 'BNAME', 'DEPT', 'DEPARTMENT', 'BRANCH_NAME']) || 'UNKNOWN BRANCH';
      
      let rawBatch = getVal(row, ['REGU', 'BATCH', 'REGULATION', 'YEAR']) || regu;
      let batchText = rawBatch || '2020-21';
      // Format numeric REGU like "20" to "2020-21", "21" to "2021-22"
      if (/^\d{2}$/.test(rawBatch)) {
        batchText = `20${rawBatch}-${parseInt(rawBatch) + 1}`;
      }
      
      const htno = getVal(row, ['HTNO', 'REGNO', 'ROLLNO', 'HT_NO', 'REGISTRATION_NO']);
      
      if (!htno) return;
      
      const key = `${branchName}_${batchText}`;
      if (!grouped[key]) {
        grouped[key] = {
          branchName,
          batchText,
          htnos: []
        };
      }
      grouped[key].htnos.push(htno);
    });
    
    return Object.values(grouped).sort((a, b) => a.branchName.localeCompare(b.branchName));
  }, [tableData, regu]);

  const handleDownloadPDF = async () => {
    const dataGroups = processReportData();
    if (dataGroups.length === 0) { alert('No data to export.'); return; }

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
      const margin = 15;
      const usableWidth = pageWidth - 2 * margin;
      
      let totalPages = 1;

      const drawHeaderAndFooter = (pageNum) => {
        if (logoData) {
          doc.addImage(logoData, 'PNG', margin, margin, 35, 30);
        }
        const centerW = pageWidth / 2;
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.text('D. B. S. Institute', centerW, margin + 12, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text('(PVT.LTD)', centerW, margin + 18, { align: 'center' });
        
        // Page fraction at top right
        doc.setFont('times', 'bold');
        doc.setFontSize(26);
        doc.text(String(pageNum), pageWidth - margin - 5, margin + 12, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(pageWidth - margin - 10, margin + 14, pageWidth - margin, margin + 14);
        doc.setFontSize(12);
        doc.text(String(totalPages), pageWidth - margin - 5, margin + 19, { align: 'center' });

        // Intro paragraph
        const introText = `THE CANDIDATES BEARING THE FOLLOWING HALL TICKET NUMBERS ARE PROVISIONALLY DECLARED TO HAVE PASSED I B.TECH I SEMESTER EXAMINATIONS OF D. B. S. INSTITUTE, CONDUCTED IN THE MONTH OF JAN-2025`;
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        const splitText = doc.splitTextToSize(introText, usableWidth);
        doc.text(splitText, margin, margin + 35);
        
        // Footer Signatures
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Controller of Examinations', margin, pageHeight - margin);
        doc.text('JNTUH Nominee', centerW, pageHeight - margin, { align: 'center' });
        doc.text('Principal', pageWidth - margin, pageHeight - margin, { align: 'right' });
        
        return margin + 35 + (splitText.length * 5) + 10;
      };

      // Calculate total pages layout first
      let simulatedY = margin + 55; // Approx header height
      let pages = 1;
      
      const colCount = 6;
      
      dataGroups.forEach(group => {
        if (simulatedY > pageHeight - margin - 30) {
          pages++;
          simulatedY = margin + 55;
        }
        simulatedY += 10; // Branch Title + Batch height roughly
        
        const rowCount = Math.ceil(group.htnos.length / colCount);
        const gridHeight = rowCount * 6;
        
        if (simulatedY + gridHeight > pageHeight - margin - 20) {
          let remainingHeight = gridHeight;
          while (simulatedY + remainingHeight > pageHeight - margin - 20) {
             const fitHeight = (pageHeight - margin - 20) - simulatedY;
             remainingHeight -= fitHeight;
             pages++;
             simulatedY = margin + 55;
          }
          simulatedY += remainingHeight;
        } else {
          simulatedY += gridHeight;
        }
        simulatedY += 10; // Spacing after block
      });
      
      totalPages = pages;
      
      // Actual drawing
      let currentY = drawHeaderAndFooter(1);
      let currentPage = 1;
      const colWidth = usableWidth / colCount;
      
      dataGroups.forEach(group => {
        if (currentY > pageHeight - margin - 40) {
            doc.addPage();
            currentPage++;
            currentY = drawHeaderAndFooter(currentPage);
        }
        
        doc.setTextColor(0, 0, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(group.branchName, margin, currentY);
        currentY += 6;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(group.batchText, margin, currentY);
        currentY += 8;
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        
        let startX = margin;
        group.htnos.forEach((htno, index) => {
          if (index > 0 && index % colCount === 0) {
            currentY += 6;
            startX = margin;
            if (currentY > pageHeight - margin - 25) {
                doc.addPage();
                currentPage++;
                currentY = drawHeaderAndFooter(currentPage);
                doc.setFont('courier', 'normal');
                doc.setFontSize(11);
            }
          }
          doc.text(htno, startX, currentY);
          startX += colWidth;
        });
        
        currentY += 15;
      });
      
      doc.save(`PassedResult_${course}_${examMY}.pdf`);
    } catch (err) {
      console.error('Error exporting PassedResult pdf:', err);
      alert(err.message || 'Failed to export pdf');
    }
  };

  const dataGroups = processReportData();

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <span className={styles.title}>PASSED RESULT</span>
          <div className={styles.spacer} />

          <div className={styles.filterGroup}>
            <label className={styles.label}>Sem</label>
            <select value={semester} onChange={e => setSemester(e.target.value)} className={styles.select}>
              <option value=''>Select</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {tableData.length > 0 && (
            <button type='button' className={styles.downloadBtn} onClick={handleDownloadPDF}>
              Download PDF
            </button>
          )}
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
          <div className={styles.placeholder} style={{ margin: 'auto' }}>Select Sem to load the report.</div>
        )}
        {isLoading && <div className={styles.loadingState} style={{ margin: 'auto' }}>Loading...</div>}

        {dataGroups.length > 0 && !isLoading && (
          <div className={styles.reportContent}>
            <div className={styles.abstractReportPage}>
              <div className={styles.reportHeader}>
                <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                <div className={styles.headerText}>
                  <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                  <p className={styles.ugcText}>(PVT.LTD)</p>
                </div>
                
                <div className={styles.pageFraction}>
                  <div className={styles.fractionTop}>1</div>
                  <div className={styles.fractionBottom}>1</div>
                </div>
              </div>
              
              <div className={styles.introText}>
                THE CANDIDATES BEARING THE FOLLOWING HALL TICKET NUMBERS ARE PROVISIONALLY DECLARED TO HAVE PASSED I B.TECH I SEMESTER EXAMINATIONS OF D. B. S. INSTITUTE, CONDUCTED IN THE MONTH OF JAN-2025
              </div>

              {dataGroups.map((group, idx) => (
                <div key={idx} className={styles.branchBlock}>
                  <h4 className={styles.branchTitle}>{group.branchName}</h4>
                  <p className={styles.batchText}>{group.batchText}</p>
                  
                  <div className={styles.htnoGrid}>
                    {group.htnos.map((htno, htIdx) => (
                      <div key={htIdx} className={styles.htnoItem}>{htno}</div>
                    ))}
                  </div>
                </div>
              ))}

              <div className={styles.footerSignatures}>
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

export default PassedResult;
