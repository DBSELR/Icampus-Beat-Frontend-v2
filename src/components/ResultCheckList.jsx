import React, { useState, useEffect, useCallback } from 'react';
import styles from './ResultCheckList.module.css';
import { getAppData, getResultCheckListSems, getResultCheckListData } from '../utils/api';

const ResultCheckList = () => {
  const appData = getAppData() || {};
  const course  = appData.course     || '';
  const examMY  = appData.examMY     || '';
  const regu    = appData.regulation || '';

  const [sem, setSem]                     = useState('');
  const [semOptions, setSemOptions]       = useState([]);
  const [checkListType, setCheckListType] = useState('1');
  const [isReadmit, setIsReadmit]         = useState(false);
  const [readmitRegu, setReadmitRegu]     = useState('');
  const [tableData, setTableData]         = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [message, setMessage]             = useState({ text: '', type: '' });

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!course || !examMY || !regu) return;
    getResultCheckListSems(course, examMY, regu)
      .then(res => {
        if (res.success && res.data)
          setSemOptions(res.data.map(r => String(r.SEM || r.Sem || r.sem || r)));
      }).catch(() => {});
  }, [course, examMY, regu]);

  const handleView = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    if (isReadmit && !readmitRegu.trim()) { showMsg('Please enter Readmit Regulation.'); return; }
    setIsLoading(true);
    setTableData([]);
    try {
      const res = await getResultCheckListData(course, examMY, regu, sem, isReadmit, readmitRegu.trim(), checkListType);
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

  const handleDownload = async () => {
    if (!sem) { showMsg('Please select Semester.'); return; }
    if (isReadmit && !readmitRegu.trim()) { showMsg('Please enter Readmit Regulation.'); return; }
    if (tableData.length === 0) { showMsg('Please click View first to load data.'); return; }

    // Export raw data CSV
    const cols = Object.keys(tableData[0]);
    const headers = cols.join(',');
    const rows = tableData.map(row =>
      cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ResultCheckList_${sem}_Type${checkListType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReadmitChange = (e) => {
    setIsReadmit(e.target.checked);
    if (!e.target.checked) setReadmitRegu('');
  };

  // ─── PIVOT LOGIC ──────────────────────────────────────────────────────────
  const getVal = (obj, keys) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    for (const key of keys) {
      const match = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (match && obj[match] != null && String(obj[match]).trim() !== '')
        return String(obj[match]).trim();
    }
    return '';
  };

  const processChecklistData = useCallback(() => {
    if (tableData.length === 0) return { students: [], subjectList: [], headerInfo: {} };

    const studentsMap = {};
    const subjectsMap = {};

    tableData.forEach(row => {
      const regno = getVal(row, ['REGNO', 'HTNO', 'HT_NO', 'REG_NO', 'ROLLNO']);
      if (!regno) return;

      const pcode = getVal(row, ['PCODE', 'P_CODE', 'SUBJECTCODE', 'SUBCODE']);
      const pnoVal = parseInt(getVal(row, ['PNO', 'P_NO'])) || 999;
      const titText = row.TIT || row.tit || '';
      const txtText = row.TXT || row.txt || '';
      const ecode = row.ECODE || row.ecode || '';

      if (!studentsMap[regno]) {
        studentsMap[regno] = {
          regno: regno,
          sname: getVal(row, ['SNAME', 'NAME', 'STUDENTNAME', 'STUDENT_NAME']),
          rowNum: parseInt(getVal(row, ['Row', 'row', 'ROW'])) || 1,
          readmission: getVal(row, ['Readmission', 'readmission', 'READMISSION']) || '-',
          withheld: getVal(row, ['WITHHELD', 'withheld']),
          marks: {},
          // Metadata (same for all rows of the query)
          programme: `${course} ( ${sem} Semester) (${regu}) ${isReadmit ? 'Readmit' : 'Regular'}`,
          branch: getVal(row, ['GRP', 'grp', 'BRANCH', 'branch', 'GSUB', 'gsub']),
          examMonthYear: getVal(row, ['EXAMMY', 'exammy', 'ExamMY', 'MONTHYEAR']),
          pnames: getVal(row, ['PNAMES', 'pnames']),
          labpname: getVal(row, ['LABPNAME', 'labpname'])
        };
      }

      studentsMap[regno].marks[pcode] = {
        txt: txtText,
        tit: titText,
        pno: pnoVal,
        ecode: ecode
      };

      // Add to unique subject list (excluding total marks and result columns)
      if (pcode !== 'TOTAL MRK' && pcode !== 'RESULT' && pcode) {
        subjectsMap[pcode] = {
          pcode: pcode,
          pno: pnoVal,
          tit: titText
        };
      }
    });

    const students = Object.values(studentsMap).sort((a, b) => a.regno.localeCompare(b.regno));
    const subjectList = Object.values(subjectsMap).sort((a, b) => a.pno - b.pno);
    const headerInfo = students[0] || {};

    return { students, subjectList, headerInfo };
  }, [tableData, course, sem, regu, isReadmit]);

  const { students, subjectList, headerInfo } = processChecklistData();

  // Helper to split dynamic strings into array of course codes/names
  const parseCourseList = (str) => {
    if (!str) return [];
    return str.split(/[\r\n]+/).map(line => line.trim()).filter(Boolean);
  };

  const theoryCoursesList = parseCourseList(headerInfo.pnames);
  const labCoursesList = parseCourseList(headerInfo.labpname);

  // Helper to parse the 3-line subheader definition
  const parseTitHeader = (tit) => {
    if (!tit) return ['', '', ''];
    const lines = tit.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    return [
      lines[0] || '',
      lines[1] || '',
      lines[2] || ''
    ];
  };

  // Helper to parse student mark text ("17 34 51 P")
  const parseStudentMark = (txt, pcode, ecode) => {
    if (!txt) return null;
    const clean = txt.trim();

    if (pcode === 'TOTAL MRK' || pcode === 'RESULT') {
      return <div className={styles.singleValueCell}>{clean}</div>;
    }

    const parts = clean.split(/\s+/);
    const paperCode = ecode || pcode;

    // Normal subject cells contain 4 spaces of sub-marks
    if (parts.length >= 4) {
      return (
        <div className={styles.marksWrapper}>
          <div className={styles.marksRow}>
            <span className={styles.markPart}>{parts[0]}</span>
            <span className={styles.markPart}>{parts[1]}</span>
            <span className={styles.markPart}>{parts[2]}</span>
            <span className={styles.markPart}>{parts[3]}</span>
          </div>
          <div className={styles.paperCodeRow}>{paperCode}</div>
        </div>
      );
    }

    // Default fallback
    return (
      <div className={styles.marksWrapper}>
        <div className={styles.singleValueCell}>{clean}</div>
        <div className={styles.paperCodeRow}>{paperCode}</div>
      </div>
    );
  };

  const printReport = () => window.print();

  return (
    <div className={styles.container}>

      {/* ── Subheading Panel ── */}
      <div className={styles.panel}>
        <div className={styles.filtersRow}>

          {/* Semester */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>Semester</label>
            <select value={sem} onChange={e => setSem(e.target.value)} className={styles.select}>
              <option value=''>-- Select --</option>
              {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Check List Type */}
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input type='radio' name='checkListType' value='1'
                checked={checkListType === '1'} onChange={e => setCheckListType(e.target.value)} />
              Check List - I
            </label>
            <label className={styles.radioLabel}>
              <input type='radio' name='checkListType' value='2'
                checked={checkListType === '2'} onChange={e => setCheckListType(e.target.value)} />
              Check List - II
            </label>
          </div>

          {/* Readmit Checkbox */}
          <div className={styles.checkGroup}>
            <label className={styles.checkLabel}>
              <input type='checkbox' checked={isReadmit} onChange={handleReadmitChange} />
              Is Readmit Result
            </label>
          </div>

          {/* Readmit Regulation */}
          {isReadmit && (
            <div className={styles.filterGroup}>
              <label className={styles.label}>Readmit Regu.</label>
              <input
                type='text'
                value={readmitRegu}
                onChange={e => setReadmitRegu(e.target.value.toUpperCase())}
                className={styles.input}
                placeholder='e.g. R20'
                maxLength={10}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionsGroup}>
            <button type='button' className={styles.viewBtn} onClick={handleView} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'View'}
            </button>
            <button type='button' className={styles.downloadBtn} onClick={handleDownload} disabled={isLoading || tableData.length === 0}>
              Download CSV
            </button>
            <button type='button' className={styles.printBtn} onClick={printReport} disabled={isLoading || tableData.length === 0}>
              Print Report
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* ── Report Area ── */}
      <div className={styles.reportArea}>
        {tableData.length === 0 && !isLoading && !message.text && (
          <div className={styles.placeholder}>
            Select Semester, Check List type and click <strong>View</strong> to load the report.
          </div>
        )}
        {isLoading && <div className={styles.loadingState}>Loading...</div>}

        {students.length > 0 && !isLoading && (
          <div className={styles.reportSheet}>
            
            {/* ── Header block ── */}
            <div className={styles.sheetHeader}>
              <div className={styles.logoAndMeta}>
                <img src="/assets/Screenshot 2026-06-18 143601.png" alt="Logo" className={styles.logo} onError={e => e.target.style.display='none'} />
                <div className={styles.metaBlock}>
                  <p><strong>Programme :</strong> {headerInfo.programme}</p>
                  <p><strong>Branch &nbsp;&nbsp;&nbsp;&nbsp;:</strong> <span className={styles.branchName}>{headerInfo.branch}</span></p>
                </div>
              </div>

              <div className={styles.instituteBlock}>
                <h1 className={styles.instTitle}>D. B. S. Institute</h1>
                <p className={styles.instSub}>(PVT.LTD)</p>
                <h2 className={styles.checklistTitle}>
                  {isReadmit ? 'READMIT ' : ''}RESULT CHECK LIST - {checkListType === '1' ? 'I' : 'II'}
                </h2>
                <p className={styles.examMY}><strong>Exam Month & Year :</strong> {headerInfo.examMonthYear || examMY}</p>
              </div>
            </div>

            {/* ── Subject Lists Block ── */}
            <div className={styles.subjectsListsBlock}>
              <div className={styles.subjectListColumn}>
                <h3 className={styles.subjectListTitle}>Course code & Name (Theory)</h3>
                <ul className={styles.subjectUl}>
                  {theoryCoursesList.map((item, idx) => (
                    <li key={idx} className={styles.subjectLi}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.subjectListColumn}>
                <h3 className={styles.subjectListTitle}>Course code & Name (Lab)</h3>
                <ul className={styles.subjectUl}>
                  {labCoursesList.map((item, idx) => (
                    <li key={idx} className={styles.subjectLi}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Pivoted Table ── */}
            <div className={styles.tableContainer}>
              <table className={styles.mainChecklistTable}>
                <thead>
                  {/* Row 1: Subject codes */}
                  <tr>
                    <th className={styles.snoTh}>S.No.</th>
                    <th className={styles.htnoTh}>H.T.No.</th>
                    {subjectList.map(sub => (
                      <th key={sub.pcode} className={styles.subjectTh}>
                        <div className={styles.subCodeText}>{sub.pcode}</div>
                      </th>
                    ))}
                    <th className={styles.totalTh}>TOTAL MRK</th>
                    <th className={styles.resultTh}>RESULT</th>
                  </tr>
                  
                  {/* Row 2: Sub-headers (CI | SE | TOT | RES) & Max/Pass criteria */}
                  <tr>
                    <th></th>
                    <th></th>
                    {subjectList.map(sub => {
                      const [l1, l2, l3] = parseTitHeader(sub.tit);
                      return (
                        <th key={`tit-${sub.pcode}`} className={styles.titTh}>
                          <div className={styles.titLine}>{l1}</div>
                          <div className={styles.titLine}>{l2}</div>
                          <div className={styles.titLine}>{l3}</div>
                        </th>
                      );
                    })}
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.regno} className={styles.studentTr}>
                      <td className={styles.snoTd}>{student.rowNum}</td>
                      <td className={styles.htnoTd}><strong>{student.regno}</strong></td>
                      
                      {/* Dynamic Subject Cells */}
                      {subjectList.map(sub => {
                        const cellData = student.marks[sub.pcode];
                        return (
                          <td key={`${student.regno}-${sub.pcode}`} className={styles.markTd}>
                            {cellData ? parseStudentMark(cellData.txt, sub.pcode, cellData.ecode) : ''}
                          </td>
                        );
                      })}

                      {/* Total Marks */}
                      <td className={styles.totalTd}>
                        {student.marks['TOTAL MRK'] ? parseStudentMark(student.marks['TOTAL MRK'].txt, 'TOTAL MRK') : ''}
                      </td>

                      {/* Result */}
                      <td className={styles.resultTd}>
                        {student.marks['RESULT'] ? parseStudentMark(student.marks['RESULT'].txt, 'RESULT') : ''}
                      </td>
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

export default ResultCheckList;
