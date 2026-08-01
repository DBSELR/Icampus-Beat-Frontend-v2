import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import styles from './SubjectwiseFailedList.module.css';
import {
  getAppData,
  getSubjectwiseFailedBatch,
  getSubjectwiseFailedSems,
  getSubjectwiseFailedBranches,
  getSubjectwiseFailedSubjects,
  getSubjectwiseFailedList,
} from '../utils/api';

const SubjectwiseFailedList = () => {
  const appData    = getAppData() || {};
  const course     = appData.course     || '';
  const examMY     = appData.examMY     || '';
  const regulation = appData.regulation || '';

  const [batch,          setBatch]          = useState('');
  const [regu,           setRegu]           = useState('');
  const [sem,            setSem]            = useState('');
  const [branch,         setBranch]         = useState('');
  const [pcode,          setPcode]          = useState('');
  const [batchOptions,   setBatchOptions]   = useState([]);
  const [semOptions,     setSemOptions]     = useState([]);
  const [branchOptions,  setBranchOptions]  = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [tableData,      setTableData]      = useState([]);
  const [tableCols,      setTableCols]      = useState([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [message,        setMessage]        = useState({ text: '', type: '' });
  const printRef = useRef(null);

  const formatProgrammeString = (c, s, exam) => {
    const semNum = parseInt(s, 10);
    if (!isNaN(semNum) && semNum >= 1 && semNum <= 8) {
      const yearMap = { 1: 'I', 2: 'I', 3: 'II', 4: 'II', 5: 'III', 6: 'III', 7: 'IV', 8: 'IV' };
      const semMap = { 1: 'I', 2: 'II', 3: 'I', 4: 'II', 5: 'I', 6: 'II', 7: 'I', 8: 'II' };
      return `${yearMap[semNum]} ${c} ${semMap[semNum]} SEMESTER EXAMINATIONS ${exam}`.toUpperCase();
    }
    return `${c} ${s} SEMESTER EXAMINATIONS ${exam}`.toUpperCase();
  };

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    getSubjectwiseFailedBatch(course)
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
    setSem('');
    setBranch('');
    setPcode('');
    setSemOptions([]);
    setBranchOptions([]);
    setSubjectOptions([]);
    setTableData([]);
    if (!reguVal || !course) return;
    try {
      const res = await getSubjectwiseFailedSems(course, reguVal);
      if (res.success && res.data)
        setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
    } catch {}
  };

  const handleSemChange = async (val) => {
    setSem(val);
    setBranch('');
    setPcode('');
    setBranchOptions([]);
    setSubjectOptions([]);
    setTableData([]);
    if (!val || !regu || !course) return;
    try {
      const res = await getSubjectwiseFailedBranches(course, regu, val);
      if (res.success && res.data)
        setBranchOptions(res.data.map(r => ({ grp: String(r.GRP || r.grp || r.BRANCH || r.branch || ''), label: String(r.BRANCH || r.branch || r.GRP || r.grp || r) })));
    } catch {}
  };

  const handleBranchChange = async (val) => {
    setBranch(val);
    setPcode('');
    setSubjectOptions([]);
    setTableData([]);
    if (!val || !sem || !regu || !course) return;
    try {
      const res = await getSubjectwiseFailedSubjects(course, regu, sem, val);
      if (res.success && res.data)
        setSubjectOptions(res.data.map(r => ({ pcode: String(r.PCODE || r.pcode || r.PCode || ''), label: String(r.SUBJECT || r.subject || r.PNAME || r.pname || r.PCODE || r.pcode || r) })));
    } catch {}
  };

  const handleView = async () => {
    if (!regu)   { showMsg('Please select Batch.'); return; }
    if (!sem)    { showMsg('Please select Semester.'); return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getSubjectwiseFailedList(regulation, course, examMY, sem);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
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

  const handleExportAll = async () => {
    if (!regu)   { showMsg('Please select Batch.'); return; }
    if (!sem)    { showMsg('Please select Semester.'); return; }
    if (!branch) { showMsg('Please select Branch.'); return; }
    setIsLoading(true);
    try {
      const res = await getSubjectwiseFailedList(regulation, course, examMY, sem);
      if (res.success && res.data && res.data.length > 0) {
        const cols    = Object.keys(res.data[0]);
        const headers = cols.join(',');
        const rows    = res.data.map(row =>
          cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv  = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `SubjectwiseFailedList_${batch}_${sem}_${branch}.csv`; a.click();
        URL.revokeObjectURL(url);
        showMsg(`${res.data.length} records exported.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const opt = {
      margin:       0.4,
      filename:     `SubjectwiseFailed_${batch}_${sem}_${branch}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: [`.${styles.subjectHeader}`, `.${styles.branchInfoRow}`, `.${styles.studentRoll}`] }
    };
    html2pdf().set(opt).from(printRef.current).save();
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
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => handleSemChange(e.target.value)} className={styles.select} disabled={!semOptions.length}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Branch</label>
            <select value={branch} onChange={e => handleBranchChange(e.target.value)} className={styles.select} disabled={!branchOptions.length}>
              <option value=''>-- Select --</option>
              {branchOptions.map(o => <option key={o.grp} value={o.grp}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Subject</label>
            <select value={pcode} onChange={e => setPcode(e.target.value)} className={styles.select} disabled={!subjectOptions.length}>
              <option value=''>-- All --</option>
              {subjectOptions.map(o => <option key={o.pcode} value={o.pcode}>{o.label}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.exportBtn} onClick={handleExportAll} disabled={isLoading}>
              Export All (Up to Exammy)
            </button>
            <button type='button' className={styles.pdfBtn} onClick={handleDownloadPDF} disabled={!tableData.length}>
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
          <div className={styles.placeholder}>Select Batch, Semester, Branch and click <strong>View</strong> to load data.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {tableData.length > 0 && (() => {
          const displayData = pcode
            ? tableData.filter(row => String(row.PCODE || row.pcode || '') === pcode)
            : tableData;

          const groupedData = {};
          displayData.forEach(row => {
            const pc = row.PCODE || row.Pcode || row.pcode || '';
            const pn = row.PNAME || row.Pname || row.pname || row.Subject || row.SUBJECT || row.subject || '';
            const subjKey = `${pc}-${pn}`;
            
            if (!groupedData[subjKey]) {
              groupedData[subjKey] = {
                pcode: pc,
                pname: pn,
                totalFailed: 0,
                branches: {}
              };
            }

            const grp = row.GRP || row.Grp || row.grp || row.Branch || row.BRANCH || row.branch || '';
            const reguStr = row.REGU || row.Regu || row.regu || row.Batch || row.BATCH || row.batch || '';
            const branchKey = `${grp}_${reguStr}`;

            if (!groupedData[subjKey].branches[branchKey]) {
              groupedData[subjKey].branches[branchKey] = {
                grp,
                regu: reguStr,
                students: []
              };
            }
            
            const regno = row.REGNO || row.Regno || row.regno || row.HTNO || row.Htno || row.htno || '';
            if (regno) {
              groupedData[subjKey].branches[branchKey].students.push(regno);
              groupedData[subjKey].totalFailed += 1;
            }
          });

          return (
            <div className={styles.printableReport} ref={printRef}>
              <div className={styles.headerBlock}>
                <div className={styles.logoBlock}>
                  <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="Institute Logo" className={styles.logo} onError={e => e.target.style.display = 'none'} />
                </div>
                <div className={styles.titleBox}>
                  <h2>D. B. S. Institute</h2>
                  <p className={styles.subtext}>(PVT.LTD)</p>
                  <p className={styles.mainTitle}>{formatProgrammeString(course, sem, examMY)}</p>
                  <p className={styles.underlinedTitle}><u>SUBJECT WISE FAILED LIST</u></p>
                </div>
                <div className={styles.pageNumberBlock}>
                  <span className={styles.pageBig}>1</span><br/>
                  <span className={styles.pageSmall}>17</span>
                </div>
              </div>

              <div className={styles.contentBlock}>
                {Object.values(groupedData).map((subj, sIdx) => (
                  <div key={sIdx} className={styles.subjectGroup}>
                    <div className={styles.subjectHeader}>
                      <span className={styles.subjectTitle}><strong>Subject Name : {subj.pcode}-{subj.pname}</strong></span>
                      <span className={styles.failedCount}><strong>{subj.totalFailed}</strong></span>
                      <div style={{ clear: 'both' }}></div>
                    </div>
                    <div className={styles.dottedLine}></div>
                    
                    {Object.values(subj.branches).map((br, bIdx) => (
                      <div key={bIdx} className={styles.branchGroup}>
                        <div className={styles.branchInfoRow}>
                          <strong>Branch Name : {br.grp}</strong>
                        </div>
                        <div className={styles.branchInfoRow}>
                          <strong>Batch &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {br.regu}</strong>
                        </div>
                        <div className={styles.studentsGrid}>
                          {br.students.length > 0 ? (
                            br.students.map((st, stIdx) => (
                              <span key={stIdx} className={styles.studentRoll}>{st}</span>
                            ))
                          ) : (
                            <span className={styles.nilText}>----NIL----</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SubjectwiseFailedList;
