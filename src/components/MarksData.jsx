import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getMarksDataBatch,
  getMarksDataExammy,
  getMarksDataSems,
  getMarksDataShData,
  getMarksDataResultData,
  getAppData,
} from '../utils/api';

const FORMATS = [
  { value: '1', label: 'Only Course Completed', sub: '(Format - 1)' },
  { value: '2', label: 'All Students SubjectWise Data', sub: '(Format - 2)' },
  { value: '3', label: 'All Students Reg.No.Wise', sub: '(Format - 3)' },
  { value: '4', label: 'Marks data - V1, RV, V3 Month & Year Wise', sub: '(Format - 4)' },
  { value: '5', label: 'JNTUK CE,', sub: '(Format - 5)' },
];

const MarksData = () => {
  const appData = getAppData() || {};
  const regulation = appData.regulation || '';
  const course = appData.course || '';

  const [batchOptions, setBatchOptions] = useState([]);
  const [exammyOptions, setExammyOptions] = useState([]);
  const [semOptions, setSemOptions] = useState([]);

  const [batch, setBatch] = useState('');
  const [examMY, setExamMY] = useState('');
  const [sem, setSem] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // DB returns uppercase column names: REGU, EXAMMY, SEM
  const optVal = (opt) => (typeof opt === 'object' ? opt.REGU ?? opt.EXAMMY ?? opt.SEM ?? opt.value ?? opt.id ?? JSON.stringify(opt) : opt);
  const optLabel = (opt) => (typeof opt === 'object' ? opt.EXAMMY ?? opt.REGU ?? opt.SEM ?? opt.label ?? opt.name ?? optVal(opt) : opt);

  // Load batch on mount; load exammy for all (no regu filter until batch is selected)
  useEffect(() => {
    getMarksDataBatch()
      .then((res) => {
        const data = res?.data ?? res;
        setBatchOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});

    getMarksDataExammy('')
      .then((res) => {
        const data = res?.data ?? res;
        setExammyOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // ExamMY change → fetch sems using selected batch (not appData.regulation)
  const handleExamMYChange = (value) => {
    setExamMY(value);
    setSem('');
    setSemOptions([]);
    if (value && batch) {
      getMarksDataSems(batch, value)
        .then((res) => {
          const data = res?.data ?? res;
          setSemOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  };

  const handleExport = async () => {
    if (!selectedFormat) { alert('Please select a data format'); return; }
    if (!examMY) { alert('Please select Exam Month & Year'); return; }
    // Format 4 uses result-data (no sem required); others need sem
    if (selectedFormat !== '4' && !sem) { alert('Please select a Semester'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      let res;
      if (selectedFormat === '4') {
        res = await getMarksDataResultData(regulation, course, examMY, sem);
      } else {
        res = await getMarksDataShData(regulation, course, batch, examMY, sem);
      }
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
      } else {
        alert('No data found for the given criteria.');
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaEdit className={globalStyles.headerIcon} />
            Marks Data for University
          </h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow} style={{ flexDirection: 'column', gap: '12px' }}>
              <label className={globalStyles.label}>Select Data Format:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                {FORMATS.map((fmt) => (
                  <label key={fmt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input
                      type="radio"
                      name="dataFormat"
                      value={fmt.value}
                      checked={selectedFormat === fmt.value}
                      onChange={() => setSelectedFormat(fmt.value)}
                    />
                    <div>
                      {fmt.label} <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 500 }}>{fmt.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={globalStyles.formRow} style={{ marginTop: '24px' }}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select All</option>
                  {batchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Exam My</label>
                <select
                  value={examMY}
                  onChange={(e) => handleExamMYChange(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select an Option</option>
                  {exammyOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select
                  value={sem}
                  onChange={(e) => setSem(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select...</option>
                  {semOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleExport}
                  className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Export'}
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {(loading || tableData.length > 0) && (
            <div style={{ marginTop: '24px' }}>
              {loading ? (
                <div className={globalStyles.noDataMessage}>Loading...</div>
              ) : (
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
                            <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksData;
