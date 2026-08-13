import React, { useState, useEffect, useRef } from 'react';
import styles from './CgcAllProgrammes.module.css';
import {
  getAppData,
  getCgcAllProgrammesBatches,
  getCgcAllProgrammesBranches,
  getCgcAllProgrammesData,
} from '../utils/api';

const CgcAllProgrammes = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [isLateral,     setIsLateral]     = useState(false);
  const [isGracing,     setIsGracing]     = useState(false);
  const [batch,         setBatch]         = useState('');
  const [branch,        setBranch]        = useState('');
  const [htNo,          setHtNo]          = useState('');
  const [batchOptions,  setBatchOptions]  = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  
  const [reportHtml,    setReportHtml]    = useState('');
  
  const [isLoading,     setIsLoading]     = useState(false);
  const [message,       setMessage]       = useState({ text: '', type: '' });
  const printRef = useRef(null);

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    getCgcAllProgrammesBatches(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    setBatch(val);
    setBranch('');
    setBranchOptions([]);
    setReportHtml('');
    if (!val || !course) return;
    try {
      const res = await getCgcAllProgrammesBranches(course, val);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.GRP || r.grp || r) })));
    } catch {}
  };

  const getBranchFullName = (code) => {
    const map = {
      'ECE': 'ELECTRONICS & COMMUNICATION ENGINEERING',
      'CSE': 'COMPUTER SCIENCE AND ENGINEERING',
      'EEE': 'ELECTRICAL AND ELECTRONICS ENGINEERING',
      'IT': 'INFORMATION TECHNOLOGY',
      'MECH': 'MECHANICAL ENGINEERING',
      'CIVIL': 'CIVIL ENGINEERING',
      'AI&ML': 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'
    };
    return map[code?.toUpperCase()] || code || 'ELECTRONICS & COMMUNICATION ENGINEERING';
  };

  const generateReportHtml = (data) => {
    let html = `
      <style>
        .cgc-page {
          font-family: 'Times New Roman', Times, serif;
          background: #fff;
          color: #000;
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10px 20px;
          box-sizing: border-box;
          page-break-after: always;
        }
        .cgc-page:last-child {
          page-break-after: auto;
        }
        .cgc-header {
          text-align: center;
          margin-bottom: 5px;
          position: relative;
        }
        .text-red { color: #cc0000 !important; }
        .text-blue { color: #000099 !important; }
        .text-green { color: #008000 !important; }
        
        .cgc-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ff7a00;
          font-size: 11px;
          font-family: Arial, Helvetica, sans-serif;
          margin-top: 5px;
        }
        .cgc-table th, .cgc-table td {
          border: 1px solid #ff7a00;
          padding: 2px 4px;
        }
        .cgc-table .col-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          height: 95px;
          text-align: center;
          vertical-align: middle;
        }
        .year-header {
          text-align: center;
          font-weight: bold;
          color: #cc0000;
          font-size: 14px;
          border-top: 1px solid #ff7a00;
          border-bottom: 1px solid #ff7a00;
        }
        .sem-header {
          text-align: center;
          font-weight: bold;
          color: #000099;
          font-size: 12px;
        }
        .border-right-thick { border-right: 2px solid #ff7a00 !important; }
        
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 10mm 15mm;
          }
        }
      </style>
    `;

    data.forEach((row) => {
      const branchName = row.BRANCH || row.BranchName || getBranchFullName(branch);
      const studentName = row.SNAME || row.sname || row.STUDENT_NAME || 'STUDENT NAME';
      const rollNo = row.REGNO || row.regno || '';
      const batchYear = row.Yearofadmission || row.BATCH || '2020-21';
      const cdate = row.cdate || row.CDATE || 'August 03, 2026';
      
      const totalCredits = parseFloat(row.CT_CR || row.cct || 0).toString();
      const aggregateMarks = parseFloat(row.ccr || row.cct || 0).toString();
      const cgpaVal = row.cgpa || row.CGPA || '';

      html += `
        <div class="cgc-page">
          <!-- HEADER -->
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-bottom: 5px;">
             <div>224056704246</div>
             <div></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 2px;">
             <div class="text-blue" style="text-transform: uppercase;">${studentName}</div>
             <div class="text-blue">${row.CCMY || examMY || 'May, 2024'}</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
             <div class="text-red">${rollNo}</div>
             <div class="text-blue" style="margin-right: 80px;">${batchYear}</div>
          </div>
          <div class="cgc-header">
             <h3 class="text-red" style="margin: 0 0 5px 0; font-size: 18px;">BACHELOR OF TECHNOLOGY</h3>
             <h4 class="text-green" style="margin: 0 0 10px 0; font-size: 14px;">Branch : ${branchName}</h4>
          </div>
      `;

      html += `
          <table class="cgc-table">
            <colgroup>
              <col style="width: 4%;" />
              <col style="width: 32%;" />
              <col style="width: 5%;" />
              <col style="width: 4%;" />
              <col style="width: 5%;" />
              <col style="width: 4%;" />
              <col style="width: 32%;" />
              <col style="width: 5%;" />
              <col style="width: 4%;" />
              <col style="width: 5%;" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-vertical">Sl .No.</th>
                <th>Subject Title</th>
                <th class="col-vertical">Grade</th>
                <th class="col-vertical">Grade Points</th>
                <th class="col-vertical border-right-thick">Credits</th>
                <th class="col-vertical">Sl .No.</th>
                <th>Subject Title</th>
                <th class="col-vertical">Grade</th>
                <th class="col-vertical">Grade Points</th>
                <th class="col-vertical">Credits</th>
              </tr>
            </thead>
            <tbody>
      `;

      const years = [
        { label: "I YEAR", leftSem: "I SEMESTER", rightSem: "II SEMESTER", leftP: "S1P", rightP: "S2P" },
        { label: "II YEAR", leftSem: "I SEMESTER", rightSem: "II SEMESTER", leftP: "S3P", rightP: "S4P" },
        { label: "III YEAR", leftSem: "I SEMESTER", rightSem: "II SEMESTER", leftP: "S5P", rightP: "S6P" },
        { label: "IV YEAR", leftSem: "I SEMESTER", rightSem: "II SEMESTER", leftP: "S7P", rightP: "S8P" },
      ];

      years.forEach((yr) => {
        let leftPapers = [];
        let rightPapers = [];
        for(let i=1; i<=12; i++) {
          const padIdx = i.toString().padStart(2, '0');
          if (row[`${yr.leftP}${padIdx}C`] || row[`${yr.leftP}${padIdx}N`]) {
            leftPapers.push({
              sl: i,
              n: row[`${yr.leftP}${padIdx}N`] || '',
              gr: row[`${yr.leftP}${padIdx}GR`] || '',
              gp: row[`${yr.leftP}${padIdx}GP`] || '',
              cr: row[`${yr.leftP}${padIdx}CR`] || ''
            });
          }
          if (row[`${yr.rightP}${padIdx}C`] || row[`${yr.rightP}${padIdx}N`]) {
            rightPapers.push({
              sl: i,
              n: row[`${yr.rightP}${padIdx}N`] || '',
              gr: row[`${yr.rightP}${padIdx}GR`] || '',
              gp: row[`${yr.rightP}${padIdx}GP`] || '',
              cr: row[`${yr.rightP}${padIdx}CR`] || ''
            });
          }
        }

        if (leftPapers.length > 0 || rightPapers.length > 0) {
          html += `
              <tr>
                <td colspan="10" class="year-header" style="padding:4px; font-size: 13px;">${yr.label}</td>
              </tr>
              <tr>
                <td colspan="5" class="sem-header border-right-thick" style="border-bottom:1px solid #ff7a00; padding:3px;">${yr.leftSem}</td>
                <td colspan="5" class="sem-header" style="border-bottom:1px solid #ff7a00; padding:3px;">${yr.rightSem}</td>
              </tr>
          `;
          
          const maxRows = Math.max(leftPapers.length, rightPapers.length);
          for(let r=0; r<maxRows; r++) {
            const l = leftPapers[r] || {};
            const right = rightPapers[r] || {};
            
            const getGr = (v) => v === 'NULL' ? '' : (v || '&nbsp;');
            
            html += `
              <tr>
                <td style="text-align:center;">${l.n ? l.sl : '&nbsp;'}</td>
                <td style="text-align:left;">${getGr(l.n)}</td>
                <td style="text-align:center;">${getGr(l.gr)}</td>
                <td style="text-align:center;">${getGr(l.gp)}</td>
                <td style="text-align:center;" class="border-right-thick">${getGr(l.cr)}</td>

                <td style="text-align:center;">${right.n ? right.sl : '&nbsp;'}</td>
                <td style="text-align:left;">${getGr(right.n)}</td>
                <td style="text-align:center;">${getGr(right.gr)}</td>
                <td style="text-align:center;">${getGr(right.gp)}</td>
                <td style="text-align:center;">${getGr(right.cr)}</td>
              </tr>
            `;
          }
        }
      });

      html += `
            </tbody>
          </table>
          
          <!-- Project Internal note -->
          <div style="text-align:right; font-weight:bold; font-size:12px; margin-top:5px; margin-right:50px;">
             ( # Project Internal =50, External =150 )
          </div>

          <!-- FOOTER -->
          <div style="margin-top: 40px; font-weight: bold; font-size: 14px;">
             <div style="display:flex; justify-content: space-around;">
               <div class="text-blue">Number of Credits registered for : <span style="color:#000;">${totalCredits}</span></div>
               <div style="color:#000;">Aggregate marks Secured for best : <span class="text-blue">${aggregateMarks}</span></div>
             </div>
             
             <div style="display:flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
               <div style="width:30%;">
                  <div class="text-blue" style="margin-left: 100px;">CGPA : <span style="color:#cc0000;">${cgpaVal}</span></div>
                  <div style="margin-top: 20px; margin-left: 50px;">${cdate}</div>
               </div>
               
               <div style="width:40%; text-align:center; display:flex; justify-content:center; align-items:center; gap:20px;">
                  <img src="/placeholder-barcode.png" alt="|||||||||||||||||||" style="height:25px; width:150px; object-fit:contain;" />
                  <img src="/placeholder-qrcode.png" alt="[QR]" style="height:50px; width:50px; object-fit:contain;" />
               </div>
               
               <div style="width:30%; text-align:center;">
                  <img src="/placeholder-signature.png" alt="Signature" style="height:40px; object-fit:contain;" />
               </div>
             </div>
          </div>
        </div>
      `;
    });

    return html;
  };

  const handleView = async () => {
    if (!batch)  { showMsg('Please select Batch.'); return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    setIsLoading(true);
    setReportHtml('');
    try {
      const res = await getCgcAllProgrammesData(course, examMY, regu, batch, branch, htNo.trim(), isGracing, isLateral);
      if (res.success && res.data && res.data.length > 0) {
        const generated = generateReportHtml(res.data);
        setReportHtml(generated);
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

  const handleDownload = () => {
    if (!reportHtml) { showMsg('Please click View first to load data.'); return; }
    // html2canvas crashes on massive reports (100+ pages). 
    // Using native print -> Save as PDF is infinitely faster and has no memory limit.
    window.print();
  };

  const handlePrint = () => window.print();

  return (
    <div className={styles.container}>
      <div className={styles.panel + " no-print"}>
        <div className={styles.filtersRow}>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={isLateral} onChange={e => setIsLateral(e.target.checked)} />
              Lateral
            </label>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={isGracing} onChange={e => setIsGracing(e.target.checked)} />
              Gracing
            </label>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value="">-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>H.T.No</label>
            <input type="text" value={htNo}
              onChange={e => setHtNo(e.target.value.toUpperCase())}
              className={styles.input} placeholder="optional" />
          </div>

          <div className={styles.actionsGroup}>
            <button type="button" className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type="button" className={styles.downloadBtn}
              onClick={handleDownload} disabled={isLoading || !reportHtml}>
              Download
            </button>
            <button type="button" className={styles.printBtn}
              onClick={handlePrint} disabled={isLoading || !reportHtml}>
              Print
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.reportArea} ref={printRef}>
        {!reportHtml && !isLoading && !message.text && (
          <div className={styles.placeholder + " no-print"}>Select Batch and Branch, then click <strong>View</strong> to load the report.</div>
        )}
        {isLoading && <div className={styles.loadingState + " no-print"}>Loading...</div>}

        {reportHtml && (
          <div 
            className="print-container"
            dangerouslySetInnerHTML={{ __html: reportHtml }} 
          />
        )}
      </div>
    </div>
  );
};

export default CgcAllProgrammes;
