import React, { useState, useEffect } from 'react';
import { FaEdit, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import * as XLSX from 'xlsx';
import {
  getCreditSecuredExammy,
  getCreditSecuredBatch,
  getCreditSecuredBranch,
  getCreditSecuredData,
  getCreditSecuredTotalData,
  getAppData,
} from '../utils/api';

const CreditSecured = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';

  const [exammyOptions, setExammyOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

  const [exammy, setExammy] = useState('');
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [credits, setCredits] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [totalData, setTotalData] = useState([]);
  const [totalColumns, setTotalColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // DB returns: exammy (lowercase), REGU/BATCH (uppercase), GRP/BRANCH (uppercase), SEM (uppercase)
  const optVal = (opt) => (typeof opt === 'object' ? opt.exammy ?? opt.REGU ?? opt.GRP ?? opt.SEM ?? opt.value ?? opt.id ?? JSON.stringify(opt) : opt);
  const optLabel = (opt) => {
    if (typeof opt !== 'object') return opt;
    if (opt.BATCH) return `${opt.BATCH} (${opt.REGU})`;
    if (opt.BRANCH) return opt.BRANCH;
    if (opt.exammy) return opt.exammy;
    if (opt.SEM) return opt.SEM;
    return opt.label ?? opt.name ?? optVal(opt);
  };

  // Load exammy and batch on mount
  useEffect(() => {
    if (course) {
      Promise.all([
        getCreditSecuredExammy(regulation, course),
        getCreditSecuredBatch(course),
      ])
        .then(([exRes, batRes]) => {
          const ex = exRes?.data ?? exRes;
          const bat = batRes?.data ?? batRes;
          setExammyOptions(Array.isArray(ex) ? ex : []);
          setBatchOptions(Array.isArray(bat) ? bat : []);
        })
        .catch(() => {});
    }
  }, [course, regulation]);

  // Batch change → load branch; sems load when exammy also selected
  const handleBatchChange = (value) => {
    setBatch(value);
    setBranch('');
    setBranchOptions([]);
    if (value && course) {
      getCreditSecuredBranch(course, value)
        .then((res) => {
          const data = res?.data ?? res;
          setBranchOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  };

  const handleExammyChange = (value) => {
    setExammy(value);
  };

  const handleView = async () => {
    if (!exammy) { alert('Please Select Exammy'); return; }
    if (!branch) { alert('Please Select Branch'); return; }
    if (!credits.trim()) { alert('Please enter No.Of Credits'); return; }

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    setTotalData([]);
    setTotalColumns([]);
    try {
      const [dataRes, totalRes] = await Promise.all([
        getCreditSecuredData(regulation, course, batch, exammy, branch, parseInt(credits) || 0),
        getCreditSecuredTotalData(regulation, course, batch, exammy, branch, ''),
      ]);

      const data = dataRes?.data ?? dataRes;
      if (Array.isArray(data) && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data);
      }

      const total = totalRes?.data ?? totalRes;
      if (Array.isArray(total) && total.length > 0) {
        setTotalColumns(Object.keys(total[0]));
        setTotalData(total);
      }

      if ((!Array.isArray(data) || data.length === 0) && (!Array.isArray(total) || total.length === 0)) {
        alert('No data found for the given criteria.');
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (tableData.length === 0 && totalData.length === 0) {
      alert('No data available to export');
      return;
    }
    const wb = XLSX.utils.book_new();
    if (tableData.length > 0) {
      const wsData = XLSX.utils.json_to_sheet(tableData);
      XLSX.utils.book_append_sheet(wb, wsData, 'Main Data');
    }
    if (totalData.length > 0) {
      const wsTotal = XLSX.utils.json_to_sheet(totalData);
      XLSX.utils.book_append_sheet(wb, wsTotal, 'Total Data');
    }
    XLSX.writeFile(wb, 'CreditSecured.xlsx');
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaEdit className={globalStyles.headerIcon} />
            Credit Secured
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
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Exammy</label>
                <select
                  value={exammy}
                  onChange={(e) => handleExammyChange(e.target.value)}
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
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">SELECT BATCH</option>
                  {batchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>No.Of Credits &lt;</label>
                <input
                  type="text"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  className={globalStyles.input}
                  placeholder="Enter Credits"
                  style={{ fontWeight: 'bold', color: 'indianred' }}
                />
              </div>

              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleView}
                  className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  disabled={loading}
                  style={{ minWidth: '120px' }}
                >
                  {loading ? 'Loading...' : 'VIEW'}
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  disabled={loading || (tableData.length === 0 && totalData.length === 0)}
                  style={{ minWidth: '120px', backgroundColor: '#28a745', borderColor: '#28a745' }}
                >
                  EXPORT EXCEL
                </button>
              </div>
            </div>
          </div>

          {/* Main Data Table */}
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
                        <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total Data Table */}
          {totalData.length > 0 && (
            <div className={globalStyles.tableWrapper} style={{ marginTop: '24px' }}>
              <table className={globalStyles.dataTable}>
                <thead>
                  <tr>
                    {totalColumns.map((col) => (
                      <th key={col}>{col.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {totalData.map((row, i) => (
                    <tr key={i}>
                      {totalColumns.map((col) => (
                        <td key={col} style={{ textAlign: 'center' }}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditSecured;
