import React, { useState, useEffect } from 'react';
import { FaList, FaFileExport } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getBackLogsListExammy,
  getBackLogsListBatch,
  getBackLogsList,
  getBackLogsListRegnoCount,
  getAppData,
} from '../utils/api';
import { exportToExcel } from '../utils/exportExcel';

const BackLogsList = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';

  // Dropdown options from API
  const [exammyOptions, setExammyOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    exammy: '',
    batch: '',
    noOfBackLogs: '',
    semFrom: '',
    semTo: '',
  });

  // Checkbox states
  const [currentMonthYearOnly, setCurrentMonthYearOnly] = useState(false);
  const [batchWise, setBatchWise] = useState(false);

  // Operator cycles: =, >=, <=
  const [equationOperator, setEquationOperator] = useState('=');
  const operators = ['=', '>=', '<='];

  // Table data
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);

  // Load exammy and batch on mount
  useEffect(() => {
    if (course && regulation) {
      getBackLogsListExammy(regulation, course)
        .then((res) => {
          const data = res?.data ?? res;
          setExammyOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
    if (course) {
      getBackLogsListBatch(course)
        .then((res) => {
          const data = res?.data ?? res;
          setBatchOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [course, regulation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name) => {
    if (name === 'currentMonthYear') {
      setCurrentMonthYearOnly((v) => !v);
      if (batchWise) setBatchWise(false);
    } else {
      setBatchWise((v) => !v);
      if (currentMonthYearOnly) setCurrentMonthYearOnly(false);
    }
  };

  // "=" button: cycle operator then fetch count
  const handleEquationClick = async () => {
    const currentIndex = operators.indexOf(equationOperator);
    const nextOp = operators[(currentIndex + 1) % operators.length];
    setEquationOperator(nextOp);

    if (!formData.exammy) { alert('Please select Exam Month & Year'); return; }

    setCountLoading(true);
    try {
      const res = await getBackLogsListRegnoCount(course, formData.exammy, formData.batch, regulation);
      const data = res?.data ?? res;
      // data may be a number or an object with count
      const count = typeof data === 'number'
        ? data
        : data?.count ?? data?.Count ?? data?.noOfBackLogs ?? data?.total ?? '';
      setFormData((prev) => ({ ...prev, noOfBackLogs: String(count) }));
    } catch {
      // silent
    } finally {
      setCountLoading(false);
    }
  };

  const handleBackLogsList = async () => {
    if (!formData.exammy) { alert('Please select Exam Month & Year'); return; }
    if (!formData.noOfBackLogs.trim()) { alert('Please calculate or enter number of backlogs'); return; }
    if (!formData.semFrom.trim()) { alert('Please enter Semester From'); return; }
    if (!formData.semTo.trim()) { alert('Please enter Semester To'); return; }

    const semFrom = parseInt(formData.semFrom);
    const semTo = parseInt(formData.semTo);
    if (isNaN(semFrom) || isNaN(semTo)) { alert('Please enter valid semester numbers'); return; }
    if (semFrom > semTo) { alert('Semester From must be ≤ Semester To'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = await getBackLogsList(
        course,
        formData.batch,
        formData.exammy,
        formData.semFrom,
        formData.semTo,
        formData.noOfBackLogs,
        equationOperator,
      );
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
      } else {
        setTableData([]);
        setTableColumns([]);
        alert('No data found for the given criteria.');
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (tableData.length === 0) { alert('No data to export. Please generate backlogs list first.'); return; }

    const headerRow = tableColumns;
    const dataRows = tableData.map((row) => tableColumns.map((col) => row[col] ?? ''));

    // Summary row at top
    const meta = [
      ['Course', course],
      ['Regulation', regulation],
      ['Exam M/Y', formData.exammy],
      ['Batch', formData.batch],
      ['Sem From', formData.semFrom],
      ['Sem To', formData.semTo],
      ['No. of BackLogs', `${equationOperator} ${formData.noOfBackLogs}`],
      [],
      headerRow,
      ...dataRows,
    ];

    exportToExcel(
      [{ name: 'BackLogs List', data: meta }],
      `BackLogsList_${course}_${formData.exammy}.xlsx`
    );
  };

  // Helper to get option value/label
  // ExamMY SP returns lowercase 'exammy'; Batch SQL returns uppercase 'REGU' and 'BATCH'
  const optVal = (opt) => (typeof opt === 'object' ? opt.value ?? opt.id ?? opt.exammy ?? opt.REGU ?? opt.batch ?? Object.values(opt)[0] ?? '' : opt);
  const optLabel = (opt) => {
    if (typeof opt !== 'object' || opt === null) return opt;
    if (opt.BATCH) return `${opt.BATCH} (${opt.REGU})`;
    return opt.label ?? opt.name ?? opt.exammy ?? opt.REGU ?? opt.batch ?? Object.values(opt)[0] ?? '';
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaList className={globalStyles.headerIcon} /> Backlogs List</h2>
        </div>
        <div className={globalStyles.boxContent}>
          <div className={globalStyles.formSection}>
            {/* Checkbox Row */}
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={currentMonthYearOnly} onChange={() => handleCheckboxChange('currentMonthYear')} />
                  Backlogs in the Current Month & Year Only
                </label>
              </div>
              <div className={globalStyles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={batchWise} onChange={() => handleCheckboxChange('batchWise')} />
                  Batch Wise
                </label>
              </div>
              <div className={globalStyles.formGroup} style={{ flex: 1, justifyContent: 'flex-end', color: '#dc2626', fontWeight: 600 }}>
                Note : Only For Credit Papers
              </div>
            </div>

            {/* Form Fields Row */}
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Exammy</label>
                <select name="exammy" value={formData.exammy} onChange={handleInputChange} className={globalStyles.dropdown}>
                  <option value="">Select Exam Month & Year</option>
                  {exammyOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select name="batch" value={formData.batch} onChange={handleInputChange} className={globalStyles.dropdown}>
                  <option value="">Select Batch</option>
                  {batchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>No. of BackLogs</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleEquationClick} className={`${globalStyles.btn} ${globalStyles.saveBtn}`} style={{ minWidth: '40px', padding: '0 8px' }} disabled={countLoading}>
                    {countLoading ? '...' : equationOperator}
                  </button>
                  <input type="text" name="noOfBackLogs" value={formData.noOfBackLogs} onChange={handleInputChange} className={globalStyles.input} placeholder="Enter Number..." style={{ fontWeight: 'bold', color: '#dc2626', flex: 1 }} />
                </div>
              </div>
            </div>

            {/* Semester Row */}
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester From</label>
                <input type="text" name="semFrom" value={formData.semFrom} onChange={handleInputChange} className={globalStyles.input} placeholder="Semester From..." style={{ fontWeight: 'bold', color: '#dc2626' }} />
              </div>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester To</label>
                <input type="text" name="semTo" value={formData.semTo} onChange={handleInputChange} className={globalStyles.input} placeholder="Semester To..." style={{ fontWeight: 'bold', color: '#dc2626' }} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={globalStyles.formRow} style={{ justifyContent: 'center', marginTop: '16px' }}>
              <button onClick={handleBackLogsList} className={`${globalStyles.btn} ${globalStyles.getDataBtn}`} disabled={loading}>
                <FaList /> {loading ? 'Loading...' : 'Back Logs List'}
              </button>
              <button onClick={handleExport} className={`${globalStyles.btn} ${globalStyles.exportBtn}`}>
                <FaFileExport /> Export To Excel
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className={globalStyles.noDataMessage}>Loading...</div>
          ) : tableData.length > 0 ? (
            <div className={globalStyles.tableWrapper}>
              <table className={globalStyles.dataTable}>
                <thead>
                  <tr>
                    {tableColumns.map((col) => (
                      <th key={col}>{col.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      {tableColumns.map((col) => (
                        <td key={col}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={globalStyles.noDataMessage}>
              Please fill in all required fields and click "Back Logs List" to generate the data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackLogsList;
