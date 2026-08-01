import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import styles from './AwardDegree.module.css';
import {
  getAppData,
  getAwardDegreeBatches,
  getAwardDegreeExammys,
  getAwardDegreeData,
} from '../utils/api';

const AwardDegree = () => {
  const appData = getAppData() || {};
  const course  = appData.course || '';

  const [batch,         setBatch]         = useState('');
  const [regu,          setRegu]          = useState('');
  const [examMY,        setExamMY]        = useState('');
  const [batchOptions,  setBatchOptions]  = useState([]);
  const [examMYOptions, setExamMYOptions] = useState([]);
  const [tableData,     setTableData]     = useState([]);
  const [tableCols,     setTableCols]     = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [message,       setMessage]       = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course) return;
    getAwardDegreeBatches(course)
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
    setExamMY('');
    setExamMYOptions([]);
    setTableData([]);
    if (!reguVal || !course) return;
    try {
      const res = await getAwardDegreeExammys(course, reguVal);
      if (res.success && res.data)
        setExamMYOptions(res.data.map(r => String(r.EXAMMY || r.ExamMY || r.examMY || r.exammy || r)));
    } catch {}
  };

  const handleView = async () => {
    if (!regu)   { showMsg('Please select Batch.'); return; }
    if (!examMY) { showMsg('Please select Exam M/Y.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getAwardDegreeData(regu, examMY, course);
      if (res.success && res.data && res.data.length > 0) {
        setTableCols(Object.keys(res.data[0]));
        setTableData(res.data);
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Fetch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const cols    = tableCols;
    const headers = cols.join(',');
    const rows    = tableData.map(row =>
      cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `AwardDegreeList_${regu}_${examMY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const element = document.getElementById('award-degree-report');
    if (!element) return;
    const opt = {
      margin:       0.3,
      filename:     `AwardDegreeList_${regu}_${examMY}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
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
            <label className={styles.label}>Exam M/Y</label>
            <select value={examMY} onChange={e => setExamMY(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {examMYOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownloadPdf} disabled={isLoading || tableData.length === 0}>
              Download
            </button>
            <button type='button' className={styles.exportBtn} onClick={handleExport} disabled={isLoading || tableData.length === 0}>
              Export Excel
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
          <div className={styles.placeholder}>Select Batch, Exam M/Y and click <strong>View</strong> to load the report.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {tableData.length > 0 && (
          <div className={styles.tableWrapper}>
            <div id="award-degree-report" className={styles.printableReport}>
              <div className={styles.headerRow}>
                <div className={styles.logoBox}>
                  <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="JB Group Logo" className={styles.logo} onError={e => e.target.style.display = 'none'} />
                </div>
                <div className={styles.titleBox}>
                  <h2>D. B. S. Institute</h2>
                  <p className={styles.subtext}>(PVT.LTD)</p>
                </div>
                <div className={styles.emptyBox}></div>
              </div>

              <div className={styles.subtitleRow}>
                <h3>B.TECH STUDENTS RECOMMENDED FOR AWARD OF DEGREE (PHASE: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</h3>
              </div>

              <div className={styles.metaRow}>
                <div><strong>Group :</strong> {tableData[0]?.Branch || tableData[0]?.BRANCH || 'CE'}</div>
                <div><strong>Batch :</strong> {batch || tableData[0]?.Batch || tableData[0]?.BATCH}</div>
                <div></div>
              </div>

              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Sl.No</th>
                    <th>Regd No.</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Father Name</th>
                    <th>CGPA</th>
                    <th>Class Awarded</th>
                    <th>Year of Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      <td className={styles.center}>{i + 1}</td>
                      <td className={styles.center}>{row.REGNO || row.Regno || row.HTNO || row.Htno || ''}</td>
                      <td className={styles.leftAlign}>{row.SNAME || row.Sname || row.Name || ''}</td>
                      <td className={styles.center}>{row.GENDER || row.Gender || ''}</td>
                      <td className={styles.leftAlign}>{row.FNAME || row.Fname || ''}</td>
                      <td className={styles.center}>{row.CGPA || ''}</td>
                      <td className={styles.center}>{row.CLASS || row.Class || ''}</td>
                      <td className={styles.center}>{row.EXAMMY || row.Exammy || examMY}</td>
                    </tr>
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

export default AwardDegree;
