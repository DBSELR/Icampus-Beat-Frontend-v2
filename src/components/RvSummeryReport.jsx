import React, { useState } from 'react';
import styles from './RvSummeryReport.module.css';
import { getAppData, getRvSummaryData, getSupplySummaryData } from '../utils/api';

const downloadCsv = (data, filename) => {
  if (!data || data.length === 0) return;
  const cols    = Object.keys(data[0]);
  const headers = cols.join(',');
  const rows    = data.map(row =>
    cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const getVal = (obj, keys, fallbackIndex) => {
  if (!obj) return '';
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const match = objKeys.find((k) => k.toLowerCase() === key.toLowerCase());
    if (match && obj[match] != null && String(obj[match]).trim() !== '') {
      return String(obj[match]).trim();
    }
  }
  // Fallback to index if available
  if (fallbackIndex !== undefined && objKeys.length > fallbackIndex) {
    return String(obj[objKeys[fallbackIndex]] || '');
  }
  return '';
};

const RvSummeryReport = () => {
  const appData    = getAppData() || {};
  const regulation = appData.regulation || '';
  const course     = appData.course     || '';
  const examMY     = appData.examMY     || '';

  const [reportData, setReportData] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [loading,    setLoading]    = useState('');
  const [message,    setMessage]    = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const processData = (data, titleSuffix, regsup) => {
    let totalApplied = 0;
    let totalBenefited = 0;

    const rows = data.map((row, idx) => {
      // Dynamically combine text from row if available, fallback to globals
      const rowCourse = getVal(row, ['COURSE']) || course;
      const rowRegulation = getVal(row, ['REGULATION', 'REGU']) || regulation;
      const rowRegsup = getVal(row, ['REGSUP', 'EXAMTYPE']) || regsup;
      const rowExammy = getVal(row, ['EXAMMY', 'MONTHYEAR', 'MONTH_YEAR']) || examMY;
      
      const examNameStr = `${rowCourse} ( ${rowRegulation} ) ${rowRegsup} EXAMINATIONS - ${rowExammy}`;

      let appliedStr = getVal(row, ['REGD', 'REDG', 'APPLIED', 'STUDENTS_APPLIED', 'NO_OF_STUDENTS_APPLIED', 'TOTAL_APPLIED', 'NO_OF_STUDENTS']);
      if (!appliedStr && isNaN(parseInt(appliedStr))) appliedStr = getVal(row, [], 1); // Fallback to col 2

      let benefitedStr = getVal(row, ['BENEFITED', 'STUDENTS_BENEFITED', 'NO_OF_STUDENTS_BENEFITED', 'TOTAL_BENEFITED', 'BENEFIT']);
      if (!benefitedStr && isNaN(parseInt(benefitedStr))) benefitedStr = getVal(row, [], 2); // Fallback to col 3

      const applied = parseInt(appliedStr) || 0;
      const benefited = parseInt(benefitedStr) || 0;
      
      let percentage = getVal(row, ['%', 'PERCENTAGE', 'PERCENT']);
      if (!percentage) {
         percentage = applied > 0 ? ((benefited / applied) * 100).toFixed(2) : '0.00';
      }

      totalApplied += applied;
      totalBenefited += benefited;

      return {
        sno: idx + 1,
        examName: examNameStr,
        applied,
        benefited,
        percentage
      };
    });

    const totalPercentage = totalApplied > 0 ? ((totalBenefited / totalApplied) * 100).toFixed(2) : '0.00';

    return {
      title: `Summary of ${titleSuffix} Result of ${course} ${examMY}`,
      rows,
      totalApplied,
      totalBenefited,
      totalPercentage
    };
  };

  const handleRvReport = async () => {
    setLoading('rv');
    setReportData(null);
    try {
      const res = await getRvSummaryData(regulation, course, examMY);
      if (res.success && res.data && res.data.length > 0) {
        setReportData(processData(res.data, 'RC / RV', 'REGULAR'));
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Load failed.');
    } finally {
      setLoading('');
    }
  };

  const handleSupplyReport = async () => {
    setLoading('supplyview');
    setReportData(null);
    try {
      const res = await getSupplySummaryData(regulation, course, examMY);
      if (res.success && res.data && res.data.length > 0) {
        setReportData(processData(res.data, 'Supply', 'SUPPLEMENTARY'));
        showMsg(`${res.data.length} records loaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Load failed.');
    } finally {
      setLoading('');
    }
  };

  const handleRvExcel = async () => {
    setLoading('rvexcel');
    try {
      const res = await getRvSummaryData(regulation, course, examMY);
      if (res.success && res.data && res.data.length > 0) {
        downloadCsv(res.data, `RV_Summary_${regulation}_${examMY}.csv`);
        showMsg(`${res.data.length} records downloaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Download failed.');
    } finally {
      setLoading('');
    }
  };

  const handleSupplyExcel = async () => {
    setLoading('supply');
    try {
      const res = await getSupplySummaryData(regulation, course, examMY);
      if (res.success && res.data && res.data.length > 0) {
        downloadCsv(res.data, `Supply_Summary_${regulation}_${examMY}.csv`);
        showMsg(`${res.data.length} records downloaded.`, 'success');
      } else {
        showMsg(res.message || 'No data found.');
      }
    } catch (err) {
      showMsg(err.message || 'Download failed.');
    } finally {
      setLoading('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const busy = loading !== '';

  return (
    <div className={styles.container}>
      {/* Hide panel during printing */}
      <style>{`
        @media print {
           .${styles.panel} { display: none !important; }
           .${styles.reportArea} { border: none !important; background: transparent !important; padding: 0 !important; }
           .${styles.reportPageContainer} { box-shadow: none !important; border: 1px solid #000 !important; margin: 0 !important; max-width: 100% !important; height: 100% !important; min-height: 100vh !important; }
           body { margin: 0; padding: 0; }
        }
      `}</style>
      
      <div className={styles.panel}>
        <div className={styles.filtersRow}>
          <button type="button" className={styles.rvBtn}
            onClick={handleRvReport} disabled={busy}>
            {loading === 'rv' ? 'Loading...' : 'Summary of RV Report'}
          </button>
          <button type="button" className={styles.rvBtn}
            onClick={handleSupplyReport} disabled={busy}>
            {loading === 'supplyview' ? 'Loading...' : 'Summary of Supply Report'}
          </button>
          <button type="button" className={styles.rvBtn}
            onClick={handleRvExcel} disabled={busy}>
            {loading === 'rvexcel' ? 'Downloading...' : 'Summary of RV Excel'}
          </button>
          <button type="button" className={styles.rvBtn}
            onClick={handleSupplyExcel} disabled={busy}>
            {loading === 'supply' ? 'Downloading...' : 'Summary of Supply Excel'}
          </button>
          {reportData && (
             <button type="button" className={styles.rvBtn} style={{backgroundColor: '#28a745'}} onClick={handlePrint} disabled={busy}>
               Print / PDF
             </button>
          )}
        </div>
        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.reportArea}>
        {busy && <div className={styles.loadingState}>Loading...</div>}
        {!busy && !reportData && (
          <div className={styles.placeholder}>
            Click a button above to load or export the report.
          </div>
        )}
        {reportData && (
          <div className={styles.reportPageContainer}>
            
            <div className={styles.reportHeader}>
              <div className={styles.logoBox}>
                 NO<br/>IMAGE
              </div>
              <div className={styles.titleRed}>D. B. S. Institute</div>
              <div className={styles.titleBlue}>(PVT.LTD)</div>
              <div className={styles.subTitle}>EXAMINATION BRANCH</div>
              <div className={styles.examTitle}>{reportData.title}</div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Name of the Examination</th>
                    <th>No.of<br/>Students<br/>Applied</th>
                    <th>No.of<br/>Students<br/>Benefited</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row) => (
                    <tr key={row.sno}>
                      <td>{row.sno}</td>
                      <td className={styles.leftAlign}>{row.examName}</td>
                      <td className={styles.bold}>{row.applied}</td>
                      <td className={styles.bold}>{row.benefited}</td>
                      <td className={styles.bold}>{row.percentage}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                   <tr>
                      <td colSpan="2" style={{textAlign: 'center'}}>TOTAL</td>
                      <td>{reportData.totalApplied}</td>
                      <td>{reportData.totalBenefited}</td>
                      <td>{reportData.totalPercentage}</td>
                   </tr>
                </tfoot>
              </table>
            </div>

            <div className={styles.overallPercentage}>
               Over all Percentage = {reportData.totalPercentage} %
            </div>

            <div className={styles.footerSection}>
               <div>Controller of Examinations</div>
               <div>Principal</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default RvSummeryReport;
