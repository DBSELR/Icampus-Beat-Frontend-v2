import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import styles from './FailedInSemResultPassed.module.css';
import { getAppData, getFailedInResultPassedInSubData } from '../utils/api';

const FailedInSemResultPassed = () => {
  const appData    = getAppData() || {};
  const course     = appData.course     || '';
  const examMY     = appData.examMY     || '';
  const regulation = appData.regulation || '';

  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY) return;
    setIsLoading(true);
    getFailedInResultPassedInSubData(regulation, course, examMY)
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
  }, [regulation, course, examMY]);

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
    
    const semGroups = {};
    const mapRoman = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII'};
    
    tableData.forEach(row => {
      const semRaw = getVal(row, ['SEM', 'SEMESTER']) || '1';
      const semText = mapRoman[semRaw] || semRaw;

      const branchName = getVal(row, ['GRP', 'BRANCH', 'BNAME', 'DEPT', 'DEPARTMENT', 'BRANCH_NAME']) || 'UNKNOWN BRANCH';
      
      const pcode = getVal(row, ['PCODE', 'SUBCODE', 'COURSECODE']);
      const rawSubject = getVal(row, ['SUBJECT', 'SNAME', 'SUB_NAME', 'PAPERNAME', 'COURSENAME', 'PNAME', 'SUBJECTNAME', 'COURSE_NAME']) || 'UNKNOWN SUBJECT';
      const subjectName = pcode ? `${pcode} - ${rawSubject}` : rawSubject;
      
      const htno = getVal(row, ['HTNO', 'REGNO', 'ROLLNO', 'HT_NO', 'REGISTRATION_NO']);
      
      if (!htno) return;
      
      if (!semGroups[semText]) semGroups[semText] = { semText, branches: {} };
      
      if (!semGroups[semText].branches[branchName]) {
        semGroups[semText].branches[branchName] = { branchName, subjects: {} };
      }
      
      if (!semGroups[semText].branches[branchName].subjects[subjectName]) {
         semGroups[semText].branches[branchName].subjects[subjectName] = { subjectName, htnos: [] };
      }
      
      semGroups[semText].branches[branchName].subjects[subjectName].htnos.push(htno);
    });
    
    return Object.values(semGroups).map(semG => ({
        semText: semG.semText,
        branches: Object.values(semG.branches).map(bg => ({
            branchName: bg.branchName,
            subjects: Object.values(bg.subjects).sort((a,b) => a.subjectName.localeCompare(b.subjectName))
        })).sort((a, b) => a.branchName.localeCompare(b.branchName))
    })).sort((a, b) => a.semText.localeCompare(b.semText));
  }, [tableData]);

  const semDataGroups = processReportData();

  const handleDownloadPDF = async () => {
    if (semDataGroups.length === 0) { alert('No data to export.'); return; }

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

      const drawHeaderAndFooter = (pageNum, semText) => {
        // Draw Outer Border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'S');

        if (logoData) {
          doc.addImage(logoData, 'PNG', margin + 5, margin + 5, 30, 25);
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
        doc.setFontSize(18);
        doc.text(`${pageNum}/${totalPages}`, pageWidth - margin - 5, margin + 18, { align: 'right' });

        // Blue subtitle
        doc.setTextColor(0, 0, 255);
        doc.setFontSize(14);
        const subTitle1Text = `${course} ${semText} SEM(${regulation}) SUPPLY RESULT, ${examMY}`.toUpperCase();
        const textWidth = doc.getTextWidth(subTitle1Text);
        doc.text(subTitle1Text, centerW, margin + 28, { align: 'center' });
        doc.setDrawColor(0, 0, 255);
        doc.line(centerW - (textWidth/2), margin + 29, centerW + (textWidth/2), margin + 29);
        
        // Red subtitle
        doc.setTextColor(139, 0, 0); // Dark Red
        doc.setFontSize(13);
        const subTitle2 = 'PASSED IN INDIVIDUAL SUBJECTS';
        doc.text(subTitle2, centerW, margin + 36, { align: 'center' });
        
        // Footer Signatures
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Addl.Controller of Examinations', margin + 5, pageHeight - margin - 10);
        doc.text('Controller of Examinations', centerW, pageHeight - margin - 10, { align: 'center' });
        doc.text('Dean, Evaluation', pageWidth - margin - 5, pageHeight - margin - 10, { align: 'right' });
        
        return margin + 46;
      };

      // Calculate total pages layout first
      let simulatedY = margin + 46;
      let pages = 0; // We will sum pages across all semesters
      const colCount = 6;
      
      semDataGroups.forEach(semGroup => {
        pages++; // each sem starts on a new page
        simulatedY = margin + 46;
        semGroup.branches.forEach(group => {
          if (simulatedY > pageHeight - margin - 40) {
            pages++;
            simulatedY = margin + 46;
          }
          simulatedY += 15; // Branch Title height
          
          group.subjects.forEach(subj => {
             if (simulatedY > pageHeight - margin - 30) {
               pages++;
               simulatedY = margin + 46;
             }
             simulatedY += 10; // Subject title
             
             const rowCount = Math.ceil(subj.htnos.length / colCount);
             const gridHeight = rowCount * 6;
             
             if (simulatedY + gridHeight > pageHeight - margin - 25) {
               let remainingHeight = gridHeight;
               while (simulatedY + remainingHeight > pageHeight - margin - 25) {
                  const fitHeight = (pageHeight - margin - 25) - simulatedY;
                  remainingHeight -= fitHeight;
                  pages++;
                  simulatedY = margin + 46;
               }
               simulatedY += remainingHeight;
             } else {
               simulatedY += gridHeight;
             }
             simulatedY += 10; // Spacing
          });
        });
      });
      
      totalPages = pages;
      if (totalPages === 0) totalPages = 1;
      
      // Actual drawing
      let currentPage = 1;
      let currentY = 0;
      const colWidth = usableWidth / colCount;
      let firstSem = true;
      
      semDataGroups.forEach(semGroup => {
        if (!firstSem) {
            doc.addPage();
            currentPage++;
        }
        firstSem = false;
        
        currentY = drawHeaderAndFooter(currentPage, semGroup.semText);
        
        semGroup.branches.forEach(group => {
          if (currentY > pageHeight - margin - 40) {
              doc.addPage();
              currentPage++;
              currentY = drawHeaderAndFooter(currentPage, semGroup.semText);
          }
          
          // Branch Title Block
          doc.setDrawColor(153, 153, 153);
          doc.setLineWidth(0.3);
          doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
          doc.setTextColor(255, 0, 255); // Magenta
          doc.setFont('times', 'bold');
          doc.setFontSize(14);
          doc.text(group.branchName, margin + 5, currentY + 2);
          currentY += 8;
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 10;
          
          group.subjects.forEach(subj => {
            if (currentY > pageHeight - margin - 35) {
                doc.addPage();
                currentPage++;
                currentY = drawHeaderAndFooter(currentPage, semGroup.semText);
            }
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont('times', 'bold');
            doc.text(`Passed in ${subj.subjectName}`, margin + 5, currentY);
            currentY += 8;
            
            doc.setFont('courier', 'normal');
            doc.setFontSize(11);
            
            let startX = margin + 5;
            subj.htnos.forEach((htno, index) => {
              if (index > 0 && index % colCount === 0) {
                currentY += 6;
                startX = margin + 5;
                if (currentY > pageHeight - margin - 25) {
                    doc.addPage();
                    currentPage++;
                    currentY = drawHeaderAndFooter(currentPage, semGroup.semText);
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(11);
                }
              }
              doc.text(htno, startX, currentY);
              startX += colWidth;
            });
            
            currentY += 12; // Gap between subjects
          });
          
          currentY += 5; // Gap between branches
        });
      });
      
      doc.save(`FailedInSemPassed_${course}_${examMY}.pdf`);
    } catch (err) {
      console.error('Error exporting FailedInSemPassed pdf:', err);
      alert(err.message || 'Failed to export pdf');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <span className={styles.title}>FAILED IN SEM RESULT — PASSED IN SUBJECT</span>
          <div className={styles.spacer} />

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
        {isLoading && <div className={styles.loadingState} style={{ margin: 'auto' }}>Loading...</div>}

        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder} style={{ margin: 'auto' }}>Data loads automatically on page open.</div>
        )}

        {semDataGroups.length > 0 && !isLoading && (
          <div className={styles.reportContent}>
            {semDataGroups.map((semGroup, semIdx) => (
              <div key={semIdx} className={styles.abstractReportPage}>
                <div className={styles.reportHeader}>
                  <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} />
                  <div className={styles.headerText}>
                    <h2 className={styles.instituteName}>D. B. S. Institute</h2>
                    <p className={styles.ugcText}>(PVT.LTD)</p>
                  </div>
                  
                  {/* We can't know exact page fractions for HTML since it flows dynamically, but we put 1/1 as requested per report page */}
                  <div className={styles.pageFraction}>1/1</div>
                </div>
                
                <div className={styles.subTitleBlock}>
                  <h3 className={styles.subTitleBlue}>{`${course} ${semGroup.semText} SEM(${regulation}) SUPPLY RESULT, ${examMY}`.toUpperCase()}</h3>
                  <h4 className={styles.subTitleRed}>PASSED IN INDIVIDUAL SUBJECTS</h4>
                </div>

                {semGroup.branches.map((group, idx) => (
                  <div key={idx} className={styles.branchBlock}>
                    <h4 className={styles.branchTitle}>{group.branchName}</h4>
                    
                    {group.subjects.map((subj, sIdx) => (
                      <div key={sIdx} className={styles.subjectBlock}>
                         <h5 className={styles.subjectTitle}>Passed in {subj.subjectName}</h5>
                         <div className={styles.htnoGrid}>
                           {subj.htnos.map((htno, htIdx) => (
                             <div key={htIdx} className={styles.htnoItem}>{htno}</div>
                           ))}
                         </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className={styles.footerSignatures}>
                  <span className={styles.sigBlock}>Addl.Controller of Examinations</span>
                  <span className={styles.sigBlock}>Controller of Examinations</span>
                  <span className={styles.sigBlock}>Dean, Evaluation</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FailedInSemResultPassed;
