import React, { useState, useEffect } from 'react';
import { FaCheckSquare, FaChevronUp } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import globalStyles from './Results.module.css';
import {
  getBackLogsListExammy,
  getBackLogsListBatch,
  getBackLogsListRegnoData,
  getBackLogsListRegnoCount,
  getAppData,
} from '../utils/api';

const BacklogsRegnoWise = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';

  const [exammyOptions, setExammyOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  const [exammy, setExammy] = useState('');
  const [batch, setBatch] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [viewType, setViewType] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  const optVal = (opt) => (typeof opt === 'object' ? opt.value ?? opt.id ?? opt.exammy ?? opt.REGU ?? opt.batch ?? Object.values(opt)[0] ?? '' : opt);
  const optLabel = (opt) => {
    if (typeof opt !== 'object' || opt === null) return opt;
    if (opt.BATCH) return `${opt.BATCH} (${opt.REGU})`;
    return opt.label ?? opt.name ?? opt.exammy ?? opt.REGU ?? opt.batch ?? Object.values(opt)[0] ?? '';
  };

  // Load dropdowns on mount
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

  const handleBackLogsData = async () => {
    if (!exammy) { alert('Please Select Exammy'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = await getBackLogsListRegnoData(course, exammy, batch, regulation);
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
        setViewType('data');
      } else {
        alert('No data found for the given criteria.');
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackLogsCount = async () => {
    if (!exammy) { alert('Please Select Exammy'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = await getBackLogsListRegnoCount(course, exammy, batch, regulation);
      const data = res?.data ?? res;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
        setViewType('count');
      } else {
        alert('No data found for the given criteria.');
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch count');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) {
      alert('No data available to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    const fileName = viewType === 'count' ? 'BacklogsCount.xlsx' : 'BacklogsData.xlsx';
    const sheetName = viewType === 'count' ? 'Count' : 'Data';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0 }}>
              <FaCheckSquare className={globalStyles.headerIcon} />
              Backlogs Regno Wise
            </h2>
            {tableData.length > 0 && (
              <button
                onClick={handleExportExcel}
                className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                disabled={loading}
                style={{ backgroundColor: '#28a745', borderColor: '#28a745', padding: '4px 12px', fontSize: '13px' }}
              >
                Export Excel
              </button>
            )}
          </div>
          <button
            className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Up To Exammy</label>
                <select
                  value={exammy}
                  onChange={(e) => setExammy(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select an Option</option>
                  {exammyOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">SELECT BATCH</option>
                  {batchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup} style={{ flexDirection: 'row', gap: '16px', alignItems: 'flex-end', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button
                  onClick={handleBackLogsData}
                  className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                  disabled={loading}
                >
                  {loading ? '...' : 'BackLogsData'}
                </button>
                <button
                  onClick={handleBackLogsCount}
                  className={`${globalStyles.btn} ${globalStyles.getDataBtn}`}
                  disabled={loading}
                >
                  {loading ? '...' : 'BackLogsCount'}
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {tableData.length > 0 && (
            <div className={globalStyles.tableWrapper} style={{ marginTop: '24px' }}>
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
                        <td key={col} style={{ textAlign: 'center' }}>
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loading && (
            <div className={globalStyles.noDataMessage}>Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BacklogsRegnoWise;
