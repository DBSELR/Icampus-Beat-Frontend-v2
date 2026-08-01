import React, { useState } from 'react';
import { FaUser, FaChevronUp, FaTh, FaFileExport } from 'react-icons/fa';
import styles from './StudentResult.module.css';
import globalStyles from './Results.module.css';
import {
  getStudentResultDetails,
  getStudentResultSgpaCgpa,
  getStudentResultPassed,
  getStudentResultFailed,
  getStudentResultAll,
  getAppData,
} from '../utils/api';
import { exportToExcel } from '../utils/exportExcel';

const StudentResult = () => {
  const appData = getAppData() || {};
  const globalExamMY = appData.examMY || '';

  const [regNo, setRegNo] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [sgpaCgpaData, setSgpaCgpaData] = useState([]);
  const [sgpaColumns, setSgpaColumns] = useState([]);
  const [resultListData, setResultListData] = useState([]);
  const [resultColumns, setResultColumns] = useState([]);

  const [includingCurrentMonthYear, setIncludingCurrentMonthYear] = useState(false);
  const [viewReport, setViewReport] = useState(false);
  const [listType, setListType] = useState('passed');

  const [isStudentDataCollapsed, setIsStudentDataCollapsed] = useState(false);
  const [isResultListCollapsed, setIsResultListCollapsed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch result data based on listType
  const fetchResultData = async (regno, type, withExamMY) => {
    setResultLoading(true);
    setResultListData([]);
    setResultColumns([]);
    try {
      let res;
      if (type === 'passed') {
        // con='true' always — SP uses @EXAMMY as upper bound for semester history
        res = await getStudentResultPassed(regno, globalExamMY, 'true');
      } else if (type === 'failed') {
        res = await getStudentResultFailed(regno, globalExamMY, 'true');
      } else {
        // 'both' → /all — TBL_SH query with optional examMY filter
        const examMY = withExamMY ? globalExamMY : '';
        res = await getStudentResultAll(regno, examMY);
      }
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setResultColumns(Object.keys(data[0]));
        setResultListData(data);
      }
    } catch {
      // silent on result fetch error
    } finally {
      setResultLoading(false);
    }
  };

  const fetchStudentData = async (regno) => {
    if (!regno.trim()) return;
    setLoading(true);
    setError('');
    setStudentData(null);
    setSgpaCgpaData([]);
    setSgpaColumns([]);
    setResultListData([]);
    setResultColumns([]);

    try {
      const [detailsRes, sgpaRes] = await Promise.all([
        getStudentResultDetails(regno),
        getStudentResultSgpaCgpa(regno),
      ]);

      const detailsRaw = detailsRes?.data ?? detailsRes;
      const details = Array.isArray(detailsRaw) ? detailsRaw[0] : detailsRaw;
      if (details && typeof details === 'object') {
        setStudentData(details);
      }

      const sgpa = sgpaRes?.data ?? sgpaRes;
      if (Array.isArray(sgpa) && sgpa.length > 0) {
        setSgpaColumns(Object.keys(sgpa[0]));
        setSgpaCgpaData(sgpa);
      }

      // Fetch result with current listType
      await fetchResultData(regno, listType, includingCurrentMonthYear);
    } catch (err) {
      setError(err.message || 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegNoChange = (e) => setRegNo(e.target.value.toUpperCase());

  const handleSearch = () => fetchStudentData(regNo);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchStudentData(regNo);
  };

  const handleRadioChange = (value) => {
    setListType(value);
    if (regNo.trim()) fetchResultData(regNo, value, includingCurrentMonthYear);
  };

  const handleCurrentMonthYearChange = () => {
    const newVal = !includingCurrentMonthYear;
    setIncludingCurrentMonthYear(newVal);
    // Re-fetch if listType is 'both'
    if (regNo.trim() && listType === 'both') {
      fetchResultData(regNo, 'both', newVal);
    }
  };

  const handleExcelExport = () => {
    if (resultListData.length === 0) { alert('No data to export. Please enter a registration number first.'); return; }

    const sheets = [];

    // Sheet 1: Student Info
    const infoRows = [
      ['Register No.', regNo],
      ['Student Name', getField('SNAME') || getField('sName') || ''],
      ['Course', getField('COURSE') || getField('course') || ''],
      ['Group', getField('GRP') || getField('grp') || ''],
      ['Regulation', getField('Regulation') || getField('regulation') || ''],
      ['Exam M/Y', globalExamMY],
      ['List Type', listType === 'passed' ? 'Passed List' : listType === 'failed' ? 'Failed List' : 'Passed & Failed List'],
    ];
    sheets.push({ name: 'Student Info', data: infoRows });

    // Sheet 2: SGPA / CGPA
    if (sgpaCgpaData.length > 0) {
      const sgpaRows = [sgpaColumns, ...sgpaCgpaData.map((r) => sgpaColumns.map((c) => r[c] ?? ''))];
      sheets.push({ name: 'SGPA CGPA', data: sgpaRows });
    }

    // Sheet 3: Result List
    const headerRow = resultColumns;
    const dataRows = resultListData.map((row) => resultColumns.map((col) => row[col] ?? ''));
    sheets.push({ name: 'Result List', data: [headerRow, ...dataRows] });

    exportToExcel(sheets, `StudentResult_${regNo}_${listType}.xlsx`);
  };

  const getField = (field) => {
    if (!studentData) return '';
    return studentData[field] ?? '';
  };

  return (
    <div className={globalStyles.container}>
      {/* Student Data Section */}
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaUser className={globalStyles.headerIcon} />Student Data</h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isStudentDataCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsStudentDataCollapsed(!isStudentDataCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isStudentDataCollapsed ? globalStyles.collapsed : ''}`}>
          <div className={globalStyles.formSection}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Left Column */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Register No.</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={regNo}
                      onChange={handleRegNoChange}
                      onKeyDown={handleKeyDown}
                      className={globalStyles.input}
                      placeholder="Enter Register Number..."
                      style={{ textTransform: 'uppercase', flex: 1 }}
                    />
                    <button onClick={handleSearch} disabled={loading} className={`${globalStyles.btn} ${globalStyles.saveBtn}`} style={{ padding: '6px 12px' }}>
                      {loading ? '...' : 'Search'}
                    </button>
                  </div>
                </div>

                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Course</label>
                  <input className={globalStyles.input} value={getField('COURSE') || getField('course') || ''} readOnly />
                </div>

                {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="checkbox" checked={includingCurrentMonthYear} onChange={handleCurrentMonthYearChange} />
                    Including Current Month & Year
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="checkbox" checked={viewReport} onChange={() => setViewReport((v) => !v)} />
                    View Report
                  </label>
                </div>
              </div>

              {/* Center Column */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Student Name</label>
                  <input className={globalStyles.input} value={getField('SNAME') || getField('sName') || getField('name') || ''} readOnly />
                </div>

                <div className={globalStyles.formGroup}>
                  <label className={globalStyles.label}>Group</label>
                  <input className={globalStyles.input} value={getField('GRP') || getField('grp') || getField('group') || ''} readOnly />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="radio" name="listType" value="passed" checked={listType === 'passed'} onChange={() => handleRadioChange('passed')} />
                    Passed List
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="radio" name="listType" value="failed" checked={listType === 'failed'} onChange={() => handleRadioChange('failed')} />
                    Failed List
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input type="radio" name="listType" value="both" checked={listType === 'both'} onChange={() => handleRadioChange('both')} />
                    Passed & Failed List
                  </label>
                </div>
              </div>

              {/* Right Column - SGPA/CGPA */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                {sgpaCgpaData.length > 0 ? (
                  <div className={globalStyles.tableWrapper} style={{ margin: 0, maxHeight: '250px', overflowY: 'auto' }}>
                    <table className={globalStyles.dataTable}>
                      <thead>
                        <tr>
                          {sgpaColumns.map((col) => (
                            <th key={col}>{col.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sgpaCgpaData.map((row, i) => (
                          <tr key={i}>
                            {sgpaColumns.map((col) => (
                              <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={globalStyles.noDataMessage} style={{ margin: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                    Enter Registration Number to view SGPA/CGPA
                  </div>
                )}
              </div>

              {/* Image Column */}
              <div style={{ width: '120px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '120px', height: '140px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                  No Image<br />Available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result List Section */}
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaTh className={globalStyles.headerIcon} />Result List</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleExcelExport} className={`${globalStyles.btn} ${globalStyles.exportBtn}`} style={{ padding: '6px 12px', fontSize: '14px' }}>
              <FaFileExport /> Excel Export
            </button>
            <button
              className={`${globalStyles.minimizeBtn} ${isResultListCollapsed ? globalStyles.rotated : ''}`}
              onClick={() => setIsResultListCollapsed(!isResultListCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className={`${globalStyles.boxContent} ${isResultListCollapsed ? globalStyles.collapsed : ''}`}>
          {resultLoading ? (
            <div className={globalStyles.noDataMessage}>Loading...</div>
          ) : resultListData.length > 0 ? (
            <div className={globalStyles.tableWrapper}>
              <table className={globalStyles.dataTable}>
                <thead>
                  <tr>
                    {resultColumns.map((col) => (
                      <th key={col}>{col.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultListData.map((row, i) => (
                    <tr key={i}>
                      {resultColumns.map((col) => (
                        <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={globalStyles.noDataMessage}>
              Please enter a Registration Number to view the result list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentResult;
