import React, { useState, useEffect } from 'react';
import { FaList, FaFileExport } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import {
  getTopperBatch,
  getTopperMaxSem,
  getTopperList,
  getTopperSemwise,
  getAppData,
} from '../utils/api';
import { exportToExcel } from '../utils/exportExcel';

const ToppersList = () => {
  const appData = getAppData() || {};
  const course = appData.course || '';
  const regulation = appData.regulation || '';
  const exammy = appData.examMY || '';

  // Dropdown options from API
  const [batchOptions, setBatchOptions] = useState([]);
  const [maxSem, setMaxSem] = useState(8);

  // Form state
  const [formData, setFormData] = useState({
    batch: '',
    noOfToppers: '',
    sem: '',
  });

  // Checkbox states (sent as Y/N to API)
  const [branch, setBranch] = useState(false);
  const [caste, setCaste] = useState(false);
  const [gender, setGender] = useState(false);
  const [withRV, setWithRV] = useState(true);
  const [onlySemWise, setOnlySemWise] = useState(false);

  // Table
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load batch on mount
  useEffect(() => {
    if (course) {
      getTopperBatch(course)
        .then((res) => {
          const data = res?.data ?? res;
          setBatchOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [course]);

  // Load maxSem when batch changes
  useEffect(() => {
    if (formData.batch) {
      getTopperMaxSem(formData.batch)
        .then((res) => {
          const raw = res?.data ?? res;
          const arr = Array.isArray(raw) ? raw : [raw];
          const first = arr[0];
          const max = typeof first === 'number'
            ? first
            : first?.MaxSEM ?? first?.maxSEM ?? first?.maxSem ?? first?.sem ?? 8;
          setMaxSem(Number(max) || 8);
        })
        .catch(() => {});
    }
  }, [formData.batch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToppersList = async () => {
    if (!formData.batch) { alert('Please select a Batch'); return; }
    if (!formData.noOfToppers.trim()) { alert('Please enter number of toppers'); return; }
    const numToppers = parseInt(formData.noOfToppers);
    if (isNaN(numToppers) || numToppers <= 0) { alert('Please enter a valid number of toppers'); return; }
    if (!formData.sem) { alert('Please select Semester'); return; }

    const branchVal = branch ? 'Y' : 'N';
    const casteVal = caste ? 'Y' : 'N';
    const genderVal = gender ? 'Y' : 'N';
    const rvVal = withRV ? 'Y' : 'N';

    setLoading(true);
    setTableData([]);
    setTableColumns([]);
    try {
      const res = onlySemWise
        ? await getTopperSemwise(regulation, course, formData.batch, formData.sem, exammy, formData.noOfToppers, branchVal, casteVal, genderVal, rvVal)
        : await getTopperList(regulation, course, formData.batch, formData.sem, exammy, formData.noOfToppers, branchVal, casteVal, genderVal, rvVal);

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
    if (tableData.length === 0) { alert('No data to export. Please generate toppers list first.'); return; }

    const headerRow = tableColumns;
    const dataRows = tableData.map((row) => tableColumns.map((col) => row[col] ?? ''));

    const meta = [
      ['Course', course],
      ['Regulation', regulation],
      ['Batch', formData.batch],
      ['Semester', formData.sem],
      ['Exam M/Y', exammy],
      ['No. of Toppers', formData.noOfToppers],
      ['Sem Wise', onlySemWise ? 'Yes' : 'No'],
      [],
      headerRow,
      ...dataRows,
    ];

    exportToExcel(
      [{ name: 'Toppers List', data: meta }],
      `ToppersList_${course}_${formData.batch}_Sem${formData.sem}.xlsx`
    );
  };

  // Batch dropdown: DB returns REGU (batch number like '20') and BATCH (display like '2020-2024')
  const optVal = (opt) => (typeof opt === 'object' ? opt.REGU ?? opt.regu ?? opt.value ?? opt.id ?? '' : opt);
  const optLabel = (opt) => {
    if (typeof opt !== 'object' || opt === null) return opt;
    if (opt.BATCH) return `${opt.BATCH} (${opt.REGU})`;
    return opt.label ?? opt.name ?? opt.REGU ?? '';
  };

  const semOptions = Array.from({ length: maxSem }, (_, i) => String(i + 1));

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaList className={globalStyles.headerIcon} /> Toppers List</h2>
        </div>
        <div className={globalStyles.boxContent}>
          <div className={globalStyles.formSection}>
            {/* Filter Bar */}
            <div className={globalStyles.formRow} style={{ alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', marginRight: '16px' }}>Toppers List :</span>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={branch} onChange={() => setBranch((v) => !v)} />
                  Branch
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={caste} onChange={() => setCaste((v) => !v)} />
                  Caste
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={gender} onChange={() => setGender((v) => !v)} />
                  Gender
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input type="checkbox" checked={withRV} onChange={() => setWithRV((v) => !v)} />
                  With RV
                </label>
              </div>
            </div>

            {/* Batch & No. of Toppers */}
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Batch</label>
                <select name="batch" value={formData.batch} onChange={handleInputChange} className={globalStyles.dropdown}>
                  <option value="">SELECT BATCH</option>
                  {batchOptions.map((opt, i) => (
                    <option key={i} value={optVal(opt)}>{optLabel(opt)}</option>
                  ))}
                </select>
              </div>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>No. Of Toppers</label>
                <input type="text" name="noOfToppers" value={formData.noOfToppers} onChange={handleInputChange} className={globalStyles.input} placeholder="Enter Number of toppers..." style={{ fontWeight: 'bold', color: '#dc2626' }} />
              </div>
            </div>

            {/* Semester */}
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Semester</label>
                <select name="sem" value={formData.sem} onChange={handleInputChange} className={globalStyles.dropdown}>
                  <option value="">Select Semester</option>
                  {semOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className={globalStyles.formGroup} style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b', marginTop: '28px' }}>
                  <input type="checkbox" checked={onlySemWise} onChange={() => setOnlySemWise((v) => !v)} />
                  Only Sem Wise
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={globalStyles.formRow} style={{ justifyContent: 'center', marginTop: '16px' }}>
              <button onClick={handleToppersList} className={`${globalStyles.btn} ${globalStyles.getDataBtn}`} disabled={loading}>
                <FaList /> {loading ? 'Loading...' : 'Toppers List'}
              </button>
              <button onClick={handleExport} className={`${globalStyles.btn} ${globalStyles.exportBtn}`}>
                <FaFileExport /> Export To Excel
              </button>
            </div>
          </div>

          {/* Note + Table */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '8px', textAlign: 'right' }}>
              Note: Including Supply
            </div>
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
                Please fill in all required fields and click "Toppers List" to generate the data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToppersList;
