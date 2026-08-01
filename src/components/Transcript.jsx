import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import styles from './Transcript.module.css';
import {
  getAppData,
  getTranscriptSems,
  getTranscriptBranches,
  getTranscriptData,
} from '../utils/api';

const numberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return String(num);
  const digitWords = {
    '0': 'ZERO', '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR',
    '5': 'FIVE', '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE'
  };
  
  return String(num).split('').map(digit => digitWords[digit] || digit).join(' ');
};

const mapRoman = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII'};

const Transcript = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem, setSem]               = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [branch, setBranch]         = useState('');
  const [branchOptions, setBranchOptions] = useState([]);
  const [regNo, setRegNo]           = useState('');
  const [isMarksMemo, setIsMarksMemo] = useState(true);
  const [tableData, setTableData]   = useState([]);
  const [enrichedStudents, setEnrichedStudents] = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY || !regu) return;
    getTranscriptSems(course, examMY, regu)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
    getTranscriptBranches(course)
      .then(res => {
        if (res.success && res.data)
          setBranchOptions(res.data.map(r => String(r.GRP || r.grp || r.Branch || r.branch || r)));
      }).catch(() => {});
  }, [course, examMY, regu]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getTranscriptData(course, examMY, regu, sem, branch, regNo, isMarksMemo);
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
    
    const students = {};
    
    tableData.forEach(row => {
      const htno = getVal(row, ['HTNO', 'REGNO', 'ROLLNO', 'HT_NO', 'REGISTRATION_NO']);
      if (!htno) return;
      
      const monthYear = getVal(row, ['EXAMMY', 'MONTHYEAR', 'MY', 'EXAM_MY', 'EXAMMONTH']) || examMY;
      const groupKey = `${htno}_${monthYear}`;
      
      if (!students[groupKey]) {
        const studentName = getVal(row, ['NAME', 'STUDENTNAME', 'SNAME', 'STUDENT_NAME']) || 'UNKNOWN STUDENT';
        const branchName = getVal(row, ['GSUB', 'GRP', 'BRANCH', 'BNAME', 'DEPT', 'DEPARTMENT', 'BRANCH_NAME']) || branch || 'UNKNOWN BRANCH';
        const barcodeId = getVal(row, ['MEMO_NUM', 'MEMONUM', 'BARCODE', 'ID', 'REF', 'BAR_CODE']) || `B${Math.floor(10000000000 + Math.random() * 90000000000)}`;
        
        const semRaw = getVal(row, ['SEM', 'SEMESTER']) || sem;
        const semRoman = mapRoman[semRaw] || semRaw;
        
        let courseYear = 'IV B.TECH- '; // Placeholder default
        let relativeSem = semRoman;
        if (semRoman === 'I') { courseYear = 'I B.TECH- '; relativeSem = 'I'; }
        else if (semRoman === 'II') { courseYear = 'I B.TECH- '; relativeSem = 'II'; }
        else if (semRoman === 'III') { courseYear = 'II B.TECH- '; relativeSem = 'I'; }
        else if (semRoman === 'IV') { courseYear = 'II B.TECH- '; relativeSem = 'II'; }
        else if (semRoman === 'V') { courseYear = 'III B.TECH- '; relativeSem = 'I'; }
        else if (semRoman === 'VI') { courseYear = 'III B.TECH- '; relativeSem = 'II'; }
        else if (semRoman === 'VII') { courseYear = 'IV B.TECH- '; relativeSem = 'I'; }
        else if (semRoman === 'VIII') { courseYear = 'IV B.TECH- '; relativeSem = 'II'; }
        
        const courseName = `${courseYear}${relativeSem} SEMESTER (${regu}) REGULAR`;

        students[groupKey] = {
          htno,
          studentName,
          branchName,
          barcodeId,
          monthYear,
          courseName,
          subjects: []
        };
      }
      
      const subjCode = getVal(row, ['PCODE', 'SUBCODE', 'SUBJECT_CODE', 'COURSECODE']) || '-';
      const subjTitle = getVal(row, ['PNAME', 'SUBJECT', 'SNAME', 'SUB_NAME', 'PAPERNAME', 'COURSENAME', 'SUBJECTNAME', 'COURSE_NAME']) || '-';
      const internal = getVal(row, ['SMARKS', 'IM', 'INTERNAL', 'INTERNALS', 'INT']);
      const external = getVal(row, ['MRK_FIN', 'EM', 'EXTERNAL', 'EXTERNALS', 'EXT']);
      const total = getVal(row, ['TOTAL', 'TOT', 'MARKS']);
      const rawResult = getVal(row, ['PAPRES', 'RESULT', 'GRADE', 'RES']);
      
      let finalResultStr = rawResult;
      if (rawResult && rawResult.toUpperCase() === 'PASS') finalResultStr = 'P';
      if (rawResult && rawResult.toUpperCase() === 'FAIL') finalResultStr = 'F';
      
      const credits = getVal(row, ['CREDITS', 'CR']);
      
      students[groupKey].subjects.push({
        code: subjCode,
        title: subjTitle,
        internal: internal,
        external: external,
        total: total,
        result: finalResultStr,
        credits: credits
      });
    });
    
    // Calculate aggregates
    Object.values(students).forEach(student => {
       let sumInternal = 0;
       let sumExternal = 0;
       let sumTotal = 0;
       let sumCredits = 0;
       let passedCount = 0;
       let appearedCount = 0;
       
       student.subjects.forEach(s => {
         sumInternal += (parseInt(s.internal) || 0);
         sumExternal += (parseInt(s.external) || 0);
         sumTotal += (parseInt(s.total) || 0);
         sumCredits += (parseFloat(s.credits) || 0);
         
         if (s.result === 'P' || s.result === 'PASS') passedCount++;
         if (s.external && s.external !== '--' && s.external !== 'A' && s.external !== 'Ab') appearedCount++;
       });
       
       student.totalInternal = sumInternal;
       student.totalExternal = sumExternal;
       student.totalTotal = sumTotal;
       student.totalCredits = sumCredits.toFixed(2);
       student.totalSubjects = student.subjects.length;
       student.passedSubjects = passedCount;
       student.appearedSubjects = appearedCount || student.subjects.length;
       student.finalResult = (passedCount === student.totalSubjects) ? 'P' : 'F';
       
       const totalWordsStr = getVal(student.subjects[0], ['TOTAL_WORDS', 'WORDS', 'TOTAL_IN_WORDS']);
       student.totalWords = totalWordsStr ? totalWordsStr.toUpperCase() : numberToWords(sumTotal);
    });
    
    return Object.values(students).sort((a,b) => a.htno.localeCompare(b.htno));
  }, [tableData, branch, sem, examMY, regu]);

  useEffect(() => {
    let isMounted = true;
    const enrichData = async () => {
      const baseStudents = processReportData();
      if (!baseStudents || baseStudents.length === 0) {
         if (isMounted) setEnrichedStudents([]);
         return;
      }
      
      const newStudents = [];
      for (const student of baseStudents) {
         let qr = '';
         try {
            qr = await QRCode.toDataURL(student.htno, { margin: 1, width: 80 });
         } catch(e) {}
         
         let bc = '';
         try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, student.barcodeId, { format: 'CODE128', displayValue: false, margin: 0, width: 1.5, height: 20 });
            bc = canvas.toDataURL('image/png');
         } catch(e) {}
         
         newStudents.push({ ...student, qrDataURL: qr, barcodeDataURL: bc });
      }
      
      if (isMounted) setEnrichedStudents(newStudents);
    };
    
    enrichData();
    return () => { isMounted = false; };
  }, [tableData, branch, sem, examMY, regu, processReportData]);

  const handleDownloadPDF = async () => {
    if (enrichedStudents.length === 0) { alert('No data to export.'); return; }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      
      let firstPage = true;
      
      enrichedStudents.forEach(student => {
        if (!firstPage) { doc.addPage(); }
        firstPage = false;
        
        // Header
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(student.barcodeId, margin + 10, margin + 15);
        doc.text(student.htno, pageWidth - margin - 40, margin + 15);
        
        doc.setFontSize(12);
        doc.text(student.courseName, margin + 10, margin + 25);
        doc.text(student.monthYear, pageWidth - margin - 40, margin + 25);
        
        doc.text(student.branchName, margin + 10, margin + 35);
        doc.text(student.studentName, margin + 10, margin + 45);
        
        // Table body
        let startY = margin + 55;
        
        const tableBody = student.subjects.map((s, idx) => [
           idx + 1,
           s.code,
           s.title,
           s.internal,
           s.external,
           s.total,
           s.result,
           s.credits
        ]);
        
        // Footer summary row
        const summaryRow = [
          '',
          '',
          `${student.totalSubjects}                  ${student.appearedSubjects}                  ${student.passedSubjects}`,
          student.totalInternal,
          student.totalExternal,
          student.totalTotal,
          student.finalResult,
          student.totalCredits
        ];
        tableBody.push(summaryRow);
        
        autoTable(doc, {
          startY: startY,
          head: [['S.No.', 'Subject Code', 'Subject Title', 'Internal\nMarks', 'End\nExam', 'Total\nMarks', 'Result', 'Credits']],
          body: tableBody,
          theme: 'plain',
          styles: { font: 'times', fontSize: 10, textColor: [0,0,0], halign: 'center', cellPadding: 2 },
          headStyles: { textColor: [0,0,0], fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'left', cellWidth: 70 } // Subject title wider and left aligned
          },
          didParseCell: function (data) {
             if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                 data.cell.styles.fontStyle = 'bold';
             }
          },
          didDrawCell: function (data) {
             doc.setLineWidth(0.2);
             doc.setDrawColor(0, 0, 0);
             
             // All cells get left and right borders
             doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
             doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
             
             // Header cells get top and bottom borders
             if (data.section === 'head') {
                 doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                 doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
             }
             
             // Summary row gets top and bottom borders
             if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                 doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                 doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
             }
          }
        });
        
        let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || (doc.autoTable && doc.autoTable.previous && doc.autoTable.previous.finalY) || startY + 100;
        
        // If the table ends too close to the bottom of the page, add a new page so the footer doesn't get cut off
        if (pageHeight - finalY < 60) {
           doc.addPage();
           finalY = margin + 10;
        }
        
        // Footer Block
        const footerY = finalY + 10;
        
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        
        // words
        doc.text(`*** ${student.totalWords} ***`, margin, footerY);
        
        // QR Code
        doc.setDrawColor(0,0,0);
        doc.setLineWidth(0.3);
        
        if (student.qrDataURL) {
           doc.addImage(student.qrDataURL, 'PNG', margin + 110, footerY - 5, 20, 20);
        } else {
           doc.rect(margin + 110, footerY - 5, 20, 20);
           doc.setFontSize(8);
           doc.text('QR', margin + 117, footerY + 5);
        }
        
        doc.setFontSize(12);
        // Sig line
        doc.line(pageWidth - margin - 40, footerY + 10, pageWidth - margin, footerY + 10);
        doc.text('Signature', pageWidth - margin - 30, footerY + 15);
        
        // Matrix grid
        doc.setFontSize(11);
        doc.text(`30          70          100          25          40`, margin + 85, footerY + 25);
        doc.text(`30          70          100          25          40`, margin + 85, footerY + 30);
        
        if (student.barcodeDataURL) {
           doc.addImage(student.barcodeDataURL, 'PNG', margin, footerY + 35, 50, 6);
        } else {
           for(let i=0; i<30; i++) {
              doc.line(margin + (i*1.5), footerY + 40, margin + (i*1.5), footerY + 45);
           }
        }
      });
      
      doc.save(`Transcript_${sem}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert(`Failed to export PDF: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value=''>-- All --</option>
              {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>H.T.No</label>
            <input
              type='text'
              value={regNo}
              onChange={e => setRegNo(e.target.value.toUpperCase())}
              className={styles.input}
              placeholder='e.g. 20B01A0501'
              maxLength={15}
            />
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isMarksMemo} onChange={e => setIsMarksMemo(e.target.checked)} />
              MarksMemo
            </label>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownloadPDF} disabled={isLoading || enrichedStudents.length === 0}>
              Download PDF
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Semester and click <strong>View</strong> to load data.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {enrichedStudents.length > 0 && !isLoading && (
          <div className={styles.memoContent}>
             {enrichedStudents.map((student, idx) => (
                <div key={idx} className={styles.memoPageContainer}>
                   
                   <div className={styles.memoHeader}>
                      <div className={styles.headerRow}>
                         <div className={styles.headerTextLg}>{student.barcodeId}</div>
                         <div className={styles.headerTextLg}>{student.htno}</div>
                      </div>
                      <div className={styles.headerRow}>
                         <div>{student.courseName}</div>
                         <div>{student.monthYear}</div>
                      </div>
                      <div className={styles.headerRow}>
                         <div>{student.branchName}</div>
                      </div>
                      <div className={styles.headerRow}>
                         <div>{student.studentName}</div>
                      </div>
                   </div>

                   <div className={styles.memoTableWrapper}>
                      <table className={styles.memoTable}>
                         <colgroup>
                            <col style={{width: '5.2%'}} />
                            <col style={{width: '13.1%'}} />
                            <col style={{width: '42.1%'}} />
                            <col style={{width: '7.9%'}} />
                            <col style={{width: '7.9%'}} />
                            <col style={{width: '7.9%'}} />
                            <col style={{width: '7.9%'}} />
                            <col style={{width: '7.9%'}} />
                         </colgroup>
                         <thead>
                            <tr>
                               <th>S.No.</th>
                               <th>Subject Code</th>
                               <th>Subject Title</th>
                               <th>Internal<br/>Marks</th>
                               <th>End<br/>Exam</th>
                               <th>Total<br/>Marks</th>
                               <th>Result</th>
                               <th>Credits</th>
                            </tr>
                         </thead>
                         <tbody>
                            {student.subjects.map((s, sIdx) => (
                               <tr key={sIdx}>
                                  <td>{sIdx + 1}</td>
                                  <td>{s.code}</td>
                                  <td className={styles.leftAlign}>{s.title}</td>
                                  <td>{s.internal}</td>
                                  <td>{s.external}</td>
                                  <td>{s.total}</td>
                                  <td>{s.result}</td>
                                  <td>{s.credits}</td>
                               </tr>
                            ))}
                            <tr className={styles.memoSummaryRow}>
                               <td></td>
                               <td></td>
                               <td className={styles.leftAlign}>
                                  <div style={{display: 'flex', justifyContent: 'space-around', width: '100%'}}>
                                     <span>{student.totalSubjects}</span>
                                     <span>{student.appearedSubjects}</span>
                                     <span>{student.passedSubjects}</span>
                                  </div>
                               </td>
                               <td>{student.totalInternal}</td>
                               <td>{student.totalExternal}</td>
                               <td>{student.totalTotal}</td>
                               <td>{student.finalResult}</td>
                               <td>{student.totalCredits}</td>
                            </tr>
                         </tbody>
                      </table>
                   </div>

                   <div className={styles.memoFooter}>
                      <div className={styles.totalWords}>*** {student.totalWords} ***</div>
                      <div className={styles.qrBlock}>
                         {student.qrDataURL ? <img src={student.qrDataURL} alt="QR Code" width="50" height="50" style={{border: '1px solid #000'}} /> : <div className={styles.qrPlaceholder}></div>}
                      </div>
                      <div className={styles.sigBlock}>
                         <div className={styles.sigPlaceholder}></div>
                      </div>
                      <div className={styles.matrixGrid}>
                         <div className={styles.matrixRow}><span>30</span><span>70</span><span>100</span><span>25</span><span>40</span></div>
                         <div className={styles.matrixRow}><span>30</span><span>70</span><span>100</span><span>25</span><span>40</span></div>
                      </div>
                      <div className={styles.barcodeBlock}>
                         {student.barcodeDataURL ? <img src={student.barcodeDataURL} alt="Barcode" style={{height: '20px', objectFit: 'contain', objectPosition: 'left'}} /> : <div className={styles.barcodePlaceholder}></div>}
                      </div>
                   </div>

                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transcript;
