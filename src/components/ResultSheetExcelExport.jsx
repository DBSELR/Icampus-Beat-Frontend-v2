import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaChevronUp, FaFileExcel } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getAppData,
  getExcelGallySems,
  getExcelGallyBranches,
  getExcelGallyData,
  getExcelGallyBacklogs,
} from '../utils/api';

const ResultSheetExcelExport = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';
  const examMY = appData.examMY || '';

  const [semOptions, setSemOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [sem, setSem] = useState('');
  const [branch, setBranch] = useState('');
  const [semType, setSemType] = useState('Reg');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load semesters on mount
  useEffect(() => {
    if (!course) return;
    getExcelGallySems(course)
      .then(res => {
        if (res.success && res.data) {
          const sems = res.data.map(r => String(r.sem || r.SEM || r));
          setSemOptions(sems);
        }
      })
      .catch(() => {});
  }, [course]);

  // Load branches when sem changes
  const handleSemChange = async (value) => {
    setSem(value);
    setBranch('');
    setBranchOptions([]);
    setTableData([]);
    if (!value || !course) return;
    try {
      const res = await getExcelGallyBranches(course, value);
      if (res.success && res.data) {
        const branches = res.data.map(r => String(r.grp || r.GRP || r.branch || r));
        setBranchOptions(branches);
      }
    } catch {}
  };

  const validate = () => {
    if (!course || !regulation) { showMessage('Course / Regulation not set. Please set from Dashboard.'); return false; }
    if (!examMY) { showMessage('ExamMY not set. Please set from Dashboard.'); return false; }
    if (!sem) { showMessage('Please select Semester.'); return false; }
    if (!branch) { showMessage('Please select Branch.'); return false; }
    return true;
  };

  const handleExcelExport = async () => {
    if (!validate()) return;
    setExporting(true);
    setTableData([]);
    try {
      const res = await getExcelGallyData(regulation, course, examMY, sem, branch, semType);
      if (res.success && res.data && res.data.length > 0) {
        const cols = Object.keys(res.data[0]);
        setTableColumns(cols);
        setTableData(res.data);
        showMessage(`${res.data.length} records loaded.`, 'success');
      } else {
        showMessage(res.message || 'No data found.');
      }
    } catch (err) {
      showMessage(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleBackLogsExcelExport = async () => {
    if (!validate()) return;
    setLoading(true);
    setTableData([]);
    try {
      const res = await getExcelGallyBacklogs(regulation, course, examMY, sem, branch, semType);
      if (res.success && res.data && res.data.length > 0) {
        const cols = Object.keys(res.data[0]);
        setTableColumns(cols);
        setTableData(res.data);
        showMessage(`${res.data.length} backlogs records loaded.`, 'success');
      } else {
        showMessage(res.message || 'No backlogs data found.');
      }
    } catch (err) {
      showMessage(err.message || 'Backlogs export failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaFileAlt className={globalStyles.headerIcon} />
            Result Sheet Excel Export
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={handleBackLogsExcelExport}
              className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
              disabled={loading}
              style={{ minWidth: 'auto', padding: '6px 16px' }}
            >
              <FaFileExcel style={{ marginRight: '6px' }} />
              {loading ? 'Loading...' : 'Back Logs Excel Export'}
            </button>
            <button
              className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            >
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          {message.text && (
            <div style={{
              margin: '0 auto 24px', padding: '12px 20px', maxWidth: '700px',
              borderRadius: '8px', textAlign: 'center', fontWeight: '600',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {message.text}
            </div>
          )}

          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              {/* Semester */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select
                  value={sem}
                  onChange={e => handleSemChange(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value=''>Select Semester</option>
                  {semOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Branch */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Branch</label>
                <select
                  value={branch}
                  onChange={e => { setBranch(e.target.value); setTableData([]); }}
                  className={globalStyles.dropdown}
                >
                  <option value=''>Select Branch</option>
                  {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Sem Type */}
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Sem Type</label>
                <select
                  value={semType}
                  onChange={e => setSemType(e.target.value)}
                  className={globalStyles.dropdown}
                >
                  <option value='Reg'>Reg</option>
                  <option value='Sup'>Sup</option>
                </select>
              </div>

              {/* Excel Export Button */}
              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button
                  onClick={handleExcelExport}
                  className={`${globalStyles.btn} ${globalStyles.exportBtn}`}
                  disabled={exporting}
                  style={{ minWidth: '150px' }}
                >
                  <FaFileExcel style={{ marginRight: '6px' }} />
                  {exporting ? 'Exporting...' : 'Excel Export'}
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
                    {tableColumns.map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      {tableColumns.map(col => (
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
        </div>
      </div>
    </div>
  );
};

export default ResultSheetExcelExport;
