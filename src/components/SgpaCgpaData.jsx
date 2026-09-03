import React, { useState, useEffect } from 'react';
import { FaEdit, FaTh, FaChevronUp, FaFileExport } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import { exportToExcel } from '../utils/exportExcel';
import {
  getRegnoWiseSgpaCgpaBatch,
  getRegnoWiseSgpaCgpaSems,
  getRegnoWiseSgpaCgpaList,
  getRegnoWiseSgpaCgpaListRegular,
  getAppData,
} from '../utils/api';

const SgpaCgpaData = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';
  const examMY = appData.examMY || '';

  const [batchOptions, setBatchOptions] = useState([]);
  const [semOptions, setSemOptions] = useState([]);

  const [batch, setBatch] = useState('');
  const [sem, setSem] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isTopFormCollapsed, setIsTopFormCollapsed] = useState(false);
  const [isDataTableCollapsed, setIsDataTableCollapsed] = useState(false);

  // Load batch on mount
  useEffect(() => {
    if (course) {
      getRegnoWiseSgpaCgpaBatch(course)
        .then((res) => {
          const data = res?.data ?? res;
          setBatchOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [course]);

  // Batch change → fetch sems (regu = batch number e.g. '20', not regulation string 'R20')
  const handleBatchChange = (value) => {
    setBatch(value);
    setSem('');
    setSemOptions([]);
    if (value && course) {
      getRegnoWiseSgpaCgpaSems(course, value)
        .then((res) => {
          const data = res?.data ?? res;
          setSemOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  };

  // DB returns uppercase column names (REGU, BATCH, SEM)
  const optVal = (opt) => (typeof opt === 'object' ? opt.REGU ?? opt.SEM ?? opt.value ?? opt.id ?? JSON.stringify(opt) : opt);
  const optLabel = (opt) => {
    if (typeof opt !== 'object') return opt;
    if (opt.BATCH) return `${opt.BATCH} (${opt.REGU})`;
    if (opt.SEM) return opt.SEM;
    return opt.label ?? opt.name ?? optVal(opt);
  };

  const fetchList = async (type) => {
    if (!batch) { alert('Please select a Batch'); return; }
    if (!sem) { alert('Please select a Semester'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = type === 'regular'
        ? await getRegnoWiseSgpaCgpaListRegular(regulation, course, batch, examMY, sem)
        : await getRegnoWiseSgpaCgpaList(regulation, course, batch, examMY, sem);
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

  const handleExport = () => {
    if (tableData.length === 0) {
      alert('No data to export.');
      return;
    }

    const headerRow = tableColumns;
    const dataRows = tableData.map((row) => tableColumns.map((col) => row[col] ?? ''));

    const meta = [
      ['Course', course],
      ['Regulation', regulation],
      ['Batch', batch],
      ['Semester', sem],
      [],
      headerRow,
      ...dataRows,
    ];

    exportToExcel(
      [{ name: 'SGPA CGPA Data', data: meta }],
      `SGPA_CGPA_${course}_${batch}_Sem${sem}.xlsx`
    );
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaEdit className={globalStyles.headerIcon} />
            SGPA and CGPA Data
          </h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isTopFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsTopFormCollapsed(!isTopFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isTopFormCollapsed ? globalStyles.collapsed : ''}`}>
          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select
                  value={batch}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select Batch</option>
                  {batchOptions.map((opt, i) => (
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
                  <option value="">Select Semester</option>
                  {semOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={globalStyles.formRow} style={{ justifyContent: 'center', marginTop: '16px', gap: '16px' }}>
              <button
                type="button"
                onClick={() => fetchList('all')}
                className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                disabled={loading}
              >
                Regular And Supply<br />Exams Considered
              </button>
              <button
                type="button"
                onClick={() => fetchList('regular')}
                className={`${globalStyles.btn} ${globalStyles.getDataBtn}`}
                disabled={loading}
              >
                Regular Exams only.<br />(Supply Exams Not Considered)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={globalStyles.box} style={{ marginTop: '24px' }}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaTh className={globalStyles.headerIcon} />
            SGPA AND CGPA DATA
          </h2>
          <div className={globalStyles.headerActions}>
            <button onClick={handleExport} className={`${globalStyles.btn} ${globalStyles.exportBtn}`} style={{ padding: '4px 12px', height: '32px' }}>
              <FaFileExport /> Export
            </button>
            <button
              className={`${globalStyles.minimizeBtn} ${isDataTableCollapsed ? globalStyles.rotated : ''}`}
              onClick={() => setIsDataTableCollapsed(!isDataTableCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className={`${globalStyles.boxContent} ${isDataTableCollapsed ? globalStyles.collapsed : ''}`}>
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
                        <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={globalStyles.noDataMessage}>
              Please select Batch and Semester, then click one of the exam type buttons to load SGPA and CGPA data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SgpaCgpaData;
