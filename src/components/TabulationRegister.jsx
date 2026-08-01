import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import styles from './TabulationRegister.module.css';
import {
  getAppData,
  getTabulationRegisterBatches,
  getTabulationRegisterBranches,
  getTabulationRegisterExamMYs,
  getTabulationRegisterData,
} from '../utils/api';

const TabulationRegister = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';

  const [batch,         setBatch]         = useState('');
  const [regu,          setRegu]          = useState('');
  const [branch,        setBranch]        = useState('');
  const [examMY,        setExamMY]        = useState('');
  const [regNo,         setRegNo]         = useState('');
  const [isReadmit,     setIsReadmit]     = useState(false);
  const [readmitRegu,   setReadmitRegu]   = useState('');
  const [batchOptions,  setBatchOptions]  = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [examMYOptions, setExamMYOptions] = useState([]);
  const [tableData,     setTableData]     = useState([]);
  const [tableCols,     setTableCols]     = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [message,       setMessage]       = useState({ text: '', type: '' });
  const [parsedData,    setParsedData]    = useState(null);

  const processData = (rawData) => {
    if (!rawData || rawData.length === 0) return null;
    
    const sInfo = rawData[0];
    const studentInfo = {
      batch: sInfo.Batch || '',
      name: sInfo.Sname || '',
      gender: sInfo.Gender || '',
      father: sInfo.Fname || '',
      branch: sInfo.Branch || '',
      course: sInfo.Course || '',
      htno: sInfo.REGNO || ''
    };

    const sems = {};
    rawData.forEach(row => {
      let sem = row.SEM || 'UNKNOWN SEMESTER';
      if (sem === '1') sem = 'I - SEMESTER';
      else if (sem === '2') sem = 'II - SEMESTER';
      else if (sem === '3') sem = 'III - SEMESTER';
      else if (sem === '4') sem = 'IV - SEMESTER';
      else if (sem === '5') sem = 'V - SEMESTER';
      else if (sem === '6') sem = 'VI - SEMESTER';
      else if (sem === '7') sem = 'VII - SEMESTER';
      else if (sem === '8') sem = 'VIII - SEMESTER';

      if (!sems[sem]) {
        sems[sem] = { 
          name: sem, 
          examAttempts: new Set(), 
          examCols: {}, 
          subjects: {},
          totals: { TCR: row.TCR || '', STCR: row.STCR || '', SGPA: row.SGPA || '', CGPA: row.CGPA || '' }
        };
      }
      
      let examMY = row.EXAMMY || '';
      if (examMY.includes('T00:00:00')) {
        const d = new Date(examMY);
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = d.getFullYear().toString().slice(-2);
        examMY = `${month}-${year}`;
      }
      
      if (examMY) sems[sem].examAttempts.add(examMY);
      
      if (examMY && row.Dtit) {
        if (!sems[sem].examCols[examMY]) sems[sem].examCols[examMY] = new Set();
        sems[sem].examCols[examMY].add(row.Dtit);
      }
      
      const pcode = row.PCODE || '';
      if (pcode) {
        if (!sems[sem].subjects[pcode]) {
          sems[sem].subjects[pcode] = { PCODE: pcode, PNAME: row.PNAME || '', marks: {} };
        }
        if (examMY) {
          if (!sems[sem].subjects[pcode].marks[examMY]) sems[sem].subjects[pcode].marks[examMY] = {};
          if (row.Dtit) sems[sem].subjects[pcode].marks[examMY][row.Dtit] = row.Dval || '';
        }
      }
    });

    const dtitOrder = ['CR', 'CIE', 'SEE', 'GR'];

    const parseMMM_YY = (str) => {
      const months = {JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11};
      const clean = str.replace('(S)', '').trim();
      const parts = clean.split('-');
      if (parts.length === 2) {
        const m = months[parts[0]];
        const y = parseInt(parts[1], 10);
        if (m !== undefined && !isNaN(y)) {
           return y * 100 + m;
        }
      }
      return 0;
    };

    const semArray = Object.values(sems).map(semObj => {
      // Sort chronologically based on MMM-YY
      semObj.examAttempts = Array.from(semObj.examAttempts).sort((a, b) => parseMMM_YY(a) - parseMMM_YY(b));
      Object.keys(semObj.examCols).forEach(examMY => {
        semObj.examCols[examMY] = Array.from(semObj.examCols[examMY]).sort((a,b) => {
          let ai = dtitOrder.indexOf(a.trim().toUpperCase()); let bi = dtitOrder.indexOf(b.trim().toUpperCase());
          if (ai === -1) ai = 99; if (bi === -1) bi = 99;
          if (ai === bi) return a.localeCompare(b);
          return ai - bi;
        });
      });
      semObj.subjects = Object.values(semObj.subjects);
      return semObj;
    });

    return { studentInfo, sems: semArray };
  };

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    getTabulationRegisterBatches(course)
      .then(res => {
        if (res.success && res.data)
          setBatchOptions(res.data.map(r => ({ regu: String(r.REGU || r.regu || ''), label: String(r.BATCH || r.batch || r.REGU || r.regu || r) })));
      }).catch(() => {});
  }, [course]);

  const handleBatchChange = async (val) => {
    const opt = batchOptions.find(o => o.regu === val);
    const reguVal = opt ? opt.regu : val;
    setBatch(val);
    setRegu(reguVal);
    setBranch('');
    setExamMY('');
    setBranchOptions([]);
    setExamMYOptions([]);
    setTableData([]);
    if (!val || !course) return;
    try {
      const [brRes, exRes] = await Promise.all([
        getTabulationRegisterBranches(course, reguVal),
        getTabulationRegisterExamMYs(course, reguVal),
      ]);
      if (brRes.success && brRes.data)
        setBranchOptions(brRes.data.map(r => ({ grp: String(r.GRP || r.grp || ''), label: String(r.GRP || r.grp || r) })));
      if (exRes.success && exRes.data)
        setExamMYOptions(exRes.data.map(r => String(r.EXAMMY || r.ExamMY || r.examMY || r.exammy || r)));
    } catch {}
  };

  const handleView = async () => {
    if (!batch)  { showMsg('Please select Batch.'); return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    if (!examMY) { showMsg('Please select Exam M/Y.'); return; }
    setIsLoading(true);
    setTableData([]);
    setParsedData(null);
    try {
      const res = await getTabulationRegisterData(course, examMY, regu, branch, regNo.trim(), isReadmit, readmitRegu.trim());
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
        setParsedData(processData(res.data));
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

  const handleExport = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const headers = tableCols.join(',');
    const rows = tableData.map(row =>
      tableCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `TabulationRegister_${batch}_${branch}_${examMY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const element = document.getElementById('report-page-content');
    if (!element) return;
    
    // Temporarily apply a class to handle any specific PDF print overrides if necessary, or just use html2pdf
    const opt = {
      margin:       0.3,
      filename:     `TabulationRegister_${batch}_${branch}_${examMY}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: 'css', avoid: 'tr' }
    };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Batch</label>
            <select value={batch} onChange={e => handleBatchChange(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {batchOptions.map(o => <option key={o.regu} value={o.regu}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>H.T.No</label>
            <input type='text' value={regNo}
              onChange={e => setRegNo(e.target.value.toUpperCase())}
              className={styles.input} placeholder='Optional' />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Exam M/Y</label>
            <select value={examMY} onChange={e => setExamMY(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {examMYOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isReadmit}
                onChange={e => { setIsReadmit(e.target.checked); if (!e.target.checked) setReadmitRegu(''); }} />
              Is Readmit Result
            </label>
          </div>

          {isReadmit && (
            <div className={styles.filterGroup}>
              <label className={styles.label}>Readmit Reg.</label>
              <input type='text' value={readmitRegu}
                onChange={e => setReadmitRegu(e.target.value.toUpperCase())}
                className={styles.input} placeholder='e.g. R20' />
            </div>
          )}

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn}
              onClick={handleDownloadPdf} disabled={isLoading || tableData.length === 0}>
              Download
            </button>
            <button type='button' className={styles.exportBtn}
              onClick={handleExport} disabled={isLoading || tableData.length === 0}>
              Export
            </button>
          </div>
        </div>

        <div className={styles.hint}>Maximum subjects for this report is 72</div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>Select Batch, Branch, Exam M/Y and click <strong>View</strong> to load the report.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {parsedData && (
          <div className={styles.tableWrapper}>
            <div id="report-page-content" className={styles.reportPage}>
              <table style={{ width: '100%', marginBottom: '2px', fontFamily: '"Times New Roman", Times, serif', color: '#000', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%' }}></td>
                    <td style={{ width: '60%', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Institute Logo" style={{ height: '55px', marginRight: '15px' }} onError={(e)=>{e.target.style.display='none'}} />
                         <div>
                           <div style={{ fontSize: '24px', fontWeight: 'bold' }}>D. B. S. Institute(76)</div>
                           <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00008b', letterSpacing: '0.5px' }}>(PVT . LTD)</div>
                           <div style={{ fontSize: '14px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '2px' }}>TABULATION REGISTER</div>
                         </div>
                      </div>
                    </td>
                    <td style={{ width: '20%', verticalAlign: 'top', padding: 0 }}>
                      <div style={{ width: '140px', float: 'right', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '65px', height: '70px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', fontSize: '10px', background: '#fff' }}>
                          NO PHOTO
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: '100%', fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', fontWeight: 'bold', marginBottom: '0px', color: '#000', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '22%', textAlign: 'left', padding: '0', verticalAlign: 'middle' }}>
                      Admitted Batch  : {parsedData.studentInfo.batch}
                    </td>
                    <td style={{ width: '28%', textAlign: 'left', padding: '0', verticalAlign: 'middle' }}>
                      Name : {parsedData.studentInfo.name}
                    </td>
                    <td style={{ width: '35%', textAlign: 'left', padding: '0', verticalAlign: 'middle' }}>
                      Father Name : {parsedData.studentInfo.father}
                    </td>
                    <td style={{ width: '15%', textAlign: 'right', padding: '0', verticalAlign: 'middle' }}>
                      <div style={{ width: '140px', float: 'right', display: 'flex', justifyContent: 'center' }}>
                        <span style={{ display: 'inline-block', background: '#e6e6e6', padding: '2px 15px', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: 'bold' }}>
                          {parsedData.studentInfo.htno}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: '100%', fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#000', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', padding: '0', verticalAlign: 'top' }}>
                      Gender :{parsedData.studentInfo.gender}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: 'bold', marginTop: '0', marginBottom: '15px', color: '#000' }}>
                B.Tech : {parsedData.studentInfo.branch}
              </div>

              <table className={styles.registerTable}>
                <tbody>
                  {parsedData.sems.map(sem => (
                    <React.Fragment key={sem.name}>
                      <tr>
                        <td colSpan={2} className={styles.semHeaderRow}>{sem.name}</td>
                        {sem.examAttempts.map((att, idx) => {
                          const isSupp = idx > 0;
                          const displayName = isSupp && !att.includes('(S)') ? `${att}(S)` : att;
                          return (
                            <td key={att} colSpan={sem.examCols[att].length} className={`${styles.semHeaderRow} ${styles.center}`}>
                              {displayName}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className={styles.subHeaderRow}>
                        <th style={{ textAlign: 'center' }}>C.Code</th>
                        <th style={{ textAlign: 'center' }}>Course Name</th>
                        {sem.examAttempts.map(att => (
                          sem.examCols[att].map(col => <th key={att + col} style={{ textAlign: 'center' }}>{col}</th>)
                        ))}
                      </tr>
                      {sem.subjects.map(sub => (
                        <tr key={sub.PCODE}>
                          <td style={{ fontWeight: 'bold', textAlign: 'left', paddingLeft: '5px' }}>{sub.PCODE}</td>
                          <td className={styles.leftAlign}>{sub.PNAME}</td>
                          {sem.examAttempts.map(att => (
                            sem.examCols[att].map(col => {
                              let val = sub.marks[att] ? sub.marks[att][col] : '';
                              if (col === 'CR' && val && !isNaN(val)) {
                                val = parseFloat(val).toFixed(2);
                              }
                              return <td key={att + col}>{val}</td>;
                            })
                          ))}
                        </tr>
                      ))}
                      <tr className={styles.tableFooter}>
                        <td colSpan={2 + sem.examAttempts.reduce((acc, att) => acc + sem.examCols[att].length, 0)}>
                          <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span>Total credits registered for semester : {sem.totals.TCR}</span>
                            <span>Total credits secured for semester : {sem.totals.STCR}</span>
                            <span>SGPA : {sem.totals.SGPA}</span>
                            <span>CGPA : {sem.totals.CGPA}</span>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabulationRegister;
