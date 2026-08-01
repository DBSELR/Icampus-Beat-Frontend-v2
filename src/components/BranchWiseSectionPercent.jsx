import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import styles from './BranchWiseSectionPercent.module.css';
import { getAppData, getBranchWiseSectionPercentSems, getBranchWiseSectionPercentData } from '../utils/api';

const BranchWiseSectionPercent = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem, setSem]             = useState('');
  const [semOptions, setSemOptions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load sems on mount
  useEffect(() => {
    if (!course || !examMY) return;
    getBranchWiseSectionPercentSems(course, examMY)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
  }, [course, examMY]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getBranchWiseSectionPercentData(course, examMY, regu, sem);
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

  const handleDownload = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const element = document.getElementById('branch-wise-section-percent-report');
    if (!element) return;
    const opt = {
      margin:       0.3,
      filename:     `BranchWiseSectionPercent_${sem}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: 'css', avoid: 'tr' }
    };
    html2pdf().from(element).set(opt).save();
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }
    const headers = tableCols.join(',');
    const rows = tableData.map(row =>
      tableCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `BranchWiseSectionPercent_${sem}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totalRegd = tableData.reduce((acc, row) => acc + (parseInt(row.REGD || row.Regd || 0, 10) || 0), 0);
  const totalAppeared = tableData.reduce((acc, row) => acc + (parseInt(row.APPEARED || row.Appeared || 0, 10) || 0), 0);
  const totalPassed = tableData.reduce((acc, row) => acc + (parseInt(row.PASSED || row.Passed || 0, 10) || 0), 0);
  const totalPassPercent = totalAppeared > 0 ? ((totalPassed / totalAppeared) * 100).toFixed(2) : '0.00';

  const formatProgrammeString = (c, s, r) => {
    const semNum = parseInt(s, 10);
    if (!isNaN(semNum) && semNum >= 1 && semNum <= 8) {
      const yearMap = { 1: 'I', 2: 'I', 3: 'II', 4: 'II', 5: 'III', 6: 'III', 7: 'IV', 8: 'IV' };
      const semMap = { 1: 'I', 2: 'II', 3: 'I', 4: 'II', 5: 'I', 6: 'II', 7: 'I', 8: 'II' };
      return `${yearMap[semNum]} ${c}. (${semMap[semNum]} Semester) (${r}) Regular`;
    }
    return `${c} (${s}) (${r}) Regular`;
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

          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownload} disabled={isLoading || tableData.length === 0}>
              Download PDF
            </button>
            <button type='button' className={styles.exportBtn} onClick={handleExportExcel} disabled={isLoading || tableData.length === 0}>
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
          <div className={styles.placeholder}>Select Semester and click <strong>View</strong> to load data.</div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {tableData.length > 0 && (
          <div className={styles.tableWrapper}>
            <div id="branch-wise-section-percent-report" className={styles.printableReport}>
              
              <div className={styles.headerRow}>
                <div className={styles.logoBox}>
                  <img src="/assets/Screenshot%202026-06-18%20143601.png" alt="JB Group Logo" className={styles.logo} onError={e => e.target.style.display = 'none'} />
                </div>
                <div className={styles.titleBox}>
                  <h2>D. B. S. Institute</h2>
                  <p className={styles.subtext}>(PVT.LTD)</p>
                  <p className={styles.officeText}>Office of the Controller of Examinations</p>
                  <h3 className={styles.mainTitle}>RESULTS ANALYSIS (BRANCH WISE SECTION)</h3>
                </div>
                <div className={styles.emptyBox}></div>
              </div>

              <div className={styles.metaRow}>
                <div>Programme : <strong>{formatProgrammeString(course, sem, regu)}</strong></div>
                <div>Exam Month & Year : <strong>{examMY}</strong></div>
              </div>

              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>BRANCH</th>
                    <th>SECTION(S)</th>
                    <th>REGD.</th>
                    <th>APPEARED</th>
                    <th>PASSED</th>
                    <th>PASS %</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      <td className={styles.branchName}><strong>{row.GRP || row.Grp || ''}</strong></td>
                      <td className={styles.center}>{row.SEC || row.Sec || '-'}</td>
                      <td className={styles.center}><strong>{row.REGD || row.Regd || ''}</strong></td>
                      <td className={styles.center}><strong>{row.APPEARED || row.Appeared || ''}</strong></td>
                      <td className={styles.center}><strong>{row.PASSED || row.Passed || ''}</strong></td>
                      <td className={styles.center}><strong>{parseFloat(row.PER || row.Per || 0).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                  
                  <tr className={styles.totalRow}>
                    <td></td>
                    <td></td>
                    <td className={styles.center}><strong>{totalRegd}</strong></td>
                    <td className={styles.center}><strong>{totalAppeared}</strong></td>
                    <td className={styles.center}><strong>{totalPassed}</strong></td>
                    <td className={styles.center}><strong>{totalPassPercent}</strong></td>
                  </tr>
                  
                  <tr className={styles.shadedTotalRow}>
                    <td colSpan={2}></td>
                    <td className={styles.center}><strong>{totalRegd}</strong></td>
                    <td className={styles.center}><strong>{totalAppeared}</strong></td>
                    <td className={styles.center}><strong>{totalPassed}</strong></td>
                    <td className={styles.center}><strong>{totalPassPercent}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div className={styles.footerSignatures}>
                <div><strong>Controller of Examinations</strong></div>
                <div><strong>JNTUH Nominee</strong></div>
                <div><strong>Principal</strong></div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchWiseSectionPercent;
