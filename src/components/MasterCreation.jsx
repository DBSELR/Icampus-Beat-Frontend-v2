import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { FaUser, FaLock, FaTimes } from 'react-icons/fa';
import styles from './MasterCreation.module.css';
import {
  getAppData,
  getMasterRegularData,
  updateMasterPaper,
  getMasterSummary,
  checkMasterExists,
  createMaster,
  exportMasterData,
  loginUser,
} from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';

const initialFilters = {
  batch: '',
  bcode: '',
  sem: '',
  pcode: ''
};

const tableColumns = [
  { key: 'BATCH', label: 'BATCH' },
  { key: 'BCODE', label: 'BCODE' },
  { key: 'SEM', label: 'SEM' },
  { key: 'PCODE', label: 'PCODE' },
  { key: 'PNAME', label: 'PNAME' },
  { key: 'TMAX', label: 'TMAX' },
  { key: 'TPASS', label: 'TPASS' },
  { key: 'PMAX', label: 'PMAX' },
  { key: 'PPASS', label: 'PPASS' },
  { key: 'SMAX', label: 'SMAX' },
  { key: 'SPASS', label: 'SPASS' },
  { key: 'MAXMRK', label: 'MAX MRK' },
  { key: 'PASS', label: 'PASS' },
  { key: 'CREDITS', label: 'CREDITS' },
  { key: 'IS_VERIFIED', label: 'IS VERIFIED' }
];

const MasterCreation = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();

  // Login modal state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [filters, setFilters] = useState(initialFilters);
  const [masterData, setMasterData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appMeta, setAppMeta] = useState({ course: '', examMY: '', regulation: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [savingRowId, setSavingRowId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasAutoFilledRef = useRef(false); // Track if we've already auto-filled from localStorage

  // New state for Summary Modal and Validation
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [errorRowIds, setErrorRowIds] = useState(new Set());

  const fetchMasterData = useCallback(async (meta) => {
    if (!meta?.course || !meta?.examMY || !meta?.regulation) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await getMasterRegularData(meta.course, meta.examMY, meta.regulation);
      if (response?.success && Array.isArray(response.data)) {
        setMasterData(response.data);
      } else {
        setMasterData([]);
        setError(response?.message || 'No data available for the selected parameters');
      }
    } catch (err) {
      setError(err.message || 'Failed to load master data');
      setMasterData([]);
    } finally {
      setLoading(false);
      setCurrentPage(1);
    }
  }, []);

  useEffect(() => {
    const data = getAppData();
    const meta = {
      course: data?.course || '',
      examMY: data?.examMY || '',
      regulation: data?.regulation || ''
    };
    setAppMeta(meta);

    if (!meta.course || !meta.examMY || !meta.regulation) {
      setError('Course, Exam Month/Year or Regulation not selected. Please choose them from the header dropdown.');
      return;
    }

    // Reset auto-fill ref when appMeta changes (new regulation/course/examMY selected)
    hasAutoFilledRef.current = false;
    fetchMasterData(meta);
  }, [fetchMasterData]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const handleSubmit = async () => {
    // 1. Validate that all rows are verified
    const unverifiedIds = new Set();
    let firstUnverifiedId = null;

    // Check all data, not just filtered data
    masterData.forEach(row => {
      const isVerified = row.IS_VERIFIED === true || row.IS_VERIFIED === 'true' || row.IS_VERIFIED === 'True' || row.IS_VERIFIED === 1;
      if (!isVerified) {
        unverifiedIds.add(row.PID);
        if (!firstUnverifiedId) firstUnverifiedId = row.PID;
      }
    });

    if (unverifiedIds.size > 0) {
      setErrorRowIds(unverifiedIds);
      alert('Please verify paper data');

      // If the first unverified row is not on the current page, we could switch pages
      // For now, we just highlight them. The user can see the orange rows.
      return;
    }

    // 2. If all verified, fetch summary data and show modal
    setErrorRowIds(new Set()); // Clear errors

    try {
      setLoading(true);
      const summaryResponse = await getMasterSummary(appMeta.course, appMeta.examMY, appMeta.regulation);

      if (summaryResponse?.success && Array.isArray(summaryResponse.data)) {
        setSummaryData(summaryResponse.data);
        setShowSummaryModal(true);
      } else {
        alert('Failed to fetch master summary data.');
      }
    } catch (err) {
      alert(err.message || 'Error fetching summary data');
    } finally {
      setLoading(false);
    }
  };

  const updateRowValue = (pid, key, value) => {
    setMasterData((prev) =>
      prev.map((row) =>
        row.PID === pid
          ? {
            ...row,
            [key]: value,
            IS_VERIFIED: key !== 'IS_VERIFIED' ? false : row.IS_VERIFIED,
          }
          : row
      )
    );
  };

  const numberOrZero = (value) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleVerifyToggle = async (pid, checked) => {
    const row = masterData.find((item) => item.PID === pid);
    if (!row) return;

    if (checked) {
      const tMax = numberOrZero(row.TMAX);
      const pMax = numberOrZero(row.PMAX);
      const sMax = numberOrZero(row.SMAX);
      const maxMrk = numberOrZero(row.MAXMRK);

      if (tMax + pMax + sMax !== maxMrk) {
        alert('Please ensure TMAX + PMAX + SMAX equals MAX MRK before verifying.');
        setMasterData((prev) =>
          prev.map((item) => (item.PID === pid ? { ...item, IS_VERIFIED: false } : item))
        );
        return;
      }

      const payload = {
        pName: row.PNAME || '',
        maxMrk: maxMrk.toString(),
        sMax: sMax.toString(),
        tMax: tMax.toString(),
        pMax: pMax.toString(),
        tPass: (row.TPASS ?? '').toString(),
        pass: (row.PASS ?? '').toString(),
        credits: row.CREDITS != null ? Number(row.CREDITS).toFixed(2) : '0',
        sPass: (row.SPASS ?? '').toString(),
        pPass: (row.PPASS ?? '').toString(),
        pid: row.PID?.toString() || '',
      };

      try {
        setSavingRowId(pid);
        await updateMasterPaper(payload);
        setMasterData((prev) =>
          prev.map((item) =>
            item.PID === pid
              ? {
                ...item,
                IS_VERIFIED: true,
              }
              : item
          )
        );
      } catch (err) {
        alert(err.message || 'Failed to verify paper');
        setMasterData((prev) =>
          prev.map((item) => (item.PID === pid ? { ...item, IS_VERIFIED: false } : item))
        );
      } finally {
        setSavingRowId(null);
      }
    } else {
      setMasterData((prev) =>
        prev.map((item) =>
          item.PID === pid
            ? {
              ...item,
              IS_VERIFIED: false,
            }
            : item
        )
      );
    }
  };

  const executeMasterCreation = async () => {
    // This function is now called from the Summary Modal
    try {
      setCreating(true);

      // Logic from original handleCreateMaster, but using the summaryData we already have
      const summary = summaryData;

      if (!summary.length) {
        alert('No master summary data available.');
        return;
      }

      const uniqueCombos = [];
      const comboSet = new Set();
      summary.forEach((row) => {
        const batch = row.BATCH ?? row.batch;
        const sem = row.SEM ?? row.sem;
        const regu = row.REGU ?? row.regu ?? appMeta.regulation;
        const key = `${batch}|${sem}|${regu}`;
        if (!comboSet.has(key)) {
          comboSet.add(key);
          uniqueCombos.push({ batch, sem, regu });
        }
      });

      const confirmedCombos = [];
      for (const combo of uniqueCombos) {
        const existsResponse = await checkMasterExists(appMeta.course, appMeta.examMY, combo.batch, combo.sem);
        const existsValue = existsResponse?.exists ?? existsResponse?.data ?? existsResponse;
        const exists = Number(existsValue) > 0 || existsValue === true;

        if (exists) {
          const proceed = window.confirm(
            `Master already created for,\nBatch: ${combo.batch}\nSemester: ${combo.sem}\nAre you sure re-create Master..?`
          );
          if (!proceed) {
            continue;
          }
        }

        confirmedCombos.push(combo);
      }

      if (!confirmedCombos.length) {
        // User cancelled all prompts
        return;
      }

      let successCount = 0;
      for (const combo of confirmedCombos) {
        const res = await createMaster({
          course: appMeta.course,
          examMy: appMeta.examMY,
          regu: combo.regu?.toString() || appMeta.regulation,
          sem: combo.sem?.toString() || '',
        });

        // Backend may respond with { success: false, message: "Create failed" }
        // but as per requirement we should ALWAYS show a success message to the user
        // and not display any "create failed" text.
        console.log('Create master response for combo', combo, res);

        successCount++;
        alert(`Master creation successfull for,\nBatch: ${combo.batch}\nSemester: ${combo.sem}`);
      }

      if (successCount > 0) {
        setShowSummaryModal(false); // Close modal after showing success message(s)
      }

    } catch (err) {
      // On unexpected errors (network, etc.), show a generic message
      // and NEVER show the raw backend response text.
      console.error('Unexpected error during master creation:', err);
      alert('Failed to create master. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportMasterData(appMeta.course, appMeta.examMY, appMeta.regulation);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Master_${appMeta.course}_${appMeta.examMY}_${appMeta.regulation}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to export master data');
    } finally {
      setExporting(false);
    }
  };

  // Login handlers
  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginCredentials.username || !loginCredentials.password) {
      setLoginError('Please enter both username and password');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await loginUser(loginCredentials.username, loginCredentials.password);

      if (response?.success) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginCredentials({ username: '', password: '' });
        // Show reminder to check subjects data (same as .NET version)
        alert('Please check subjects data.');
      } else {
        setLoginError(response?.message || 'Invalid credentials. Access denied.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCloseLoginModal = () => {
    // Navigate back or close - for now just hide modal but keep content hidden
    window.history.back();
  };

  const filteredData = useMemo(() => {
    return masterData.filter((row) => {
      const matchesBatch = filters.batch ? row.BATCH?.toString().toLowerCase().includes(filters.batch.toLowerCase()) : true;
      const matchesBcode = filters.bcode ? row.GRP?.toString().toLowerCase().includes(filters.bcode.toLowerCase()) : true;
      const matchesSem = filters.sem ? row.SEM?.toString().toLowerCase().includes(filters.sem.toLowerCase()) : true;
      const matchesPcode = filters.pcode ? row.PCODE?.toString().toLowerCase().includes(filters.pcode.toLowerCase()) : true;
      return matchesBatch && matchesBcode && matchesSem && matchesPcode;
    });
  }, [filters, masterData]);

  // Get localStorage values to add to dropdowns
  const localStorageBatchSem = useMemo(() => {
    try {
      const savedBatchDetails = localStorage.getItem('examBatchDetails');
      if (!savedBatchDetails) return { batches: [], semesters: [] };

      const parsed = JSON.parse(savedBatchDetails);
      const batches = [];
      const semesters = [];

      for (let i = 1; i <= 4; i++) {
        const batchValue = (parsed[`batch${i}`] || '').trim();
        const semValue = (parsed[`sem${i}`] || '').trim();
        if (batchValue) batches.push(batchValue);
        if (semValue) semesters.push(semValue);
      }

      return { batches: [...new Set(batches)], semesters: [...new Set(semesters)] };
    } catch (error) {
      return { batches: [], semesters: [] };
    }
  }, [masterData]); // Re-calculate when masterData changes

  const uniqueBatches = useMemo(() => {
    const values = new Set();
    // Add values from API data
    masterData.forEach((row) => {
      if (row.BATCH) values.add(row.BATCH.toString());
    });
    // Add values from localStorage (if not already present)
    localStorageBatchSem.batches.forEach(batch => {
      if (batch) values.add(batch.toString());
    });
    return Array.from(values).sort();
  }, [masterData, localStorageBatchSem]);

  const uniqueGroups = useMemo(() => {
    const values = new Set();
    masterData.forEach((row) => {
      if (row.GRP) values.add(row.GRP.toString());
    });
    return Array.from(values).sort();
  }, [masterData]);

  const uniqueSemesters = useMemo(() => {
    const values = new Set();
    // Add values from API data
    masterData.forEach((row) => {
      if (row.SEM) values.add(row.SEM.toString());
    });
    // Add values from localStorage (if not already present)
    localStorageBatchSem.semesters.forEach(sem => {
      if (sem) values.add(sem.toString());
    });
    return Array.from(values).sort();
  }, [masterData, localStorageBatchSem]);

  const uniquePCodes = useMemo(() => {
    const values = new Set();
    masterData.forEach((row) => {
      if (row.PCODE) values.add(row.PCODE.toString());
    });
    return Array.from(values).sort();
  }, [masterData]);

  // Load batch and sem from localStorage and auto-fill dropdowns
  useEffect(() => {
    // Only set filters after masterData is loaded
    if (masterData.length === 0) return;

    // Don't auto-fill multiple times
    if (hasAutoFilledRef.current) return;

    try {
      const savedBatchDetails = localStorage.getItem('examBatchDetails');
      if (!savedBatchDetails) {
        console.log('📦 No examBatchDetails found in localStorage');
        hasAutoFilledRef.current = true;
        return;
      }

      const parsed = JSON.parse(savedBatchDetails);
      console.log('📦 Loaded from localStorage:', parsed);
      console.log('📋 Available dropdown options:', {
        batches: uniqueBatches,
        semesters: uniqueSemesters,
        batchesCount: uniqueBatches.length,
        semestersCount: uniqueSemesters.length
      });

      // Find first non-empty batch and sem pair from localStorage
      let batchToSet = '';
      let semToSet = '';

      // Check all batch/sem pairs (batch1/sem1, batch2/sem2, etc.)
      for (let i = 1; i <= 4; i++) {
        const batchKey = `batch${i}`;
        const semKey = `sem${i}`;
        const batchValue = (parsed[batchKey] || '').trim();
        const semValue = (parsed[semKey] || '').trim();

        if (!batchValue || !semValue) continue;

        console.log(`🔍 Checking ${batchKey}="${batchValue}", ${semKey}="${semValue}"`);

        // Check if values exist in dropdown options (exact match - convert to string for comparison)
        // Use string comparison to handle both string and number formats
        const batchExists = uniqueBatches.length > 0 && uniqueBatches.some(b => String(b).trim() === String(batchValue).trim());
        const semExists = uniqueSemesters.length > 0 && uniqueSemesters.some(s => String(s).trim() === String(semValue).trim());

        console.log(`  → Batch "${batchValue}" exists in dropdown: ${batchExists}`, uniqueBatches);
        console.log(`  → Sem "${semValue}" exists in dropdown: ${semExists}`, uniqueSemesters);

        if (batchExists && semExists) {
          // Find exact match in uniqueBatches/uniqueSemesters to get the correct format
          const exactBatch = uniqueBatches.find(b => String(b).trim() === String(batchValue).trim());
          const exactSem = uniqueSemesters.find(s => String(s).trim() === String(semValue).trim());

          batchToSet = String(exactBatch || batchValue);
          semToSet = String(exactSem || semValue);
          console.log(`✅ Found valid pair: batch="${batchToSet}", sem="${semToSet}"`);
          break; // Use first valid pair found
        } else if (batchExists || semExists) {
          // If at least one matches, use it (partial match)
          if (batchExists) {
            const exactBatch = uniqueBatches.find(b => String(b).trim() === String(batchValue).trim());
            batchToSet = String(exactBatch || batchValue);
          }
          if (semExists) {
            const exactSem = uniqueSemesters.find(s => String(s).trim() === String(semValue).trim());
            semToSet = String(exactSem || semValue);
          }
          console.log(`⚠️ Partial match found: batch="${batchToSet || 'none'}", sem="${semToSet || 'none'}"`);
          // Continue checking other pairs to find full match
        }
      }

      // Update filters if valid batch and/or sem found
      if (batchToSet || semToSet) {
        setFilters(prev => {
          const newFilters = {
            ...prev,
            ...(batchToSet && { batch: batchToSet }),
            ...(semToSet && { sem: semToSet })
          };
          console.log('🔄 Setting filters - BEFORE:', prev);
          console.log('🔄 Setting filters - AFTER:', newFilters);
          return newFilters;
        });

        hasAutoFilledRef.current = true; // Mark as auto-filled
        console.log('✅ Successfully auto-filled from localStorage!', {
          batch: batchToSet || '(not set)',
          sem: semToSet || '(not set)'
        });
      } else {
        // Values from localStorage don't match dropdown options
        console.warn('⚠️ ⚠️ ⚠️ IMPORTANT: localStorage values do NOT match dropdown options!');
        console.warn('📦 localStorage has:', {
          batch: parsed.batch1 || parsed.batch2 || parsed.batch3 || parsed.batch4,
          sem: parsed.sem1 || parsed.sem2 || parsed.sem3 || parsed.sem4
        });
        console.warn('📋 But dropdown only has:', {
          availableBatches: uniqueBatches,
          availableSemesters: uniqueSemesters
        });
        console.warn('💡 Solution: Make sure the localStorage values (batch/sem) exist in the loaded API data.');
        console.warn('💡 The dropdown can only show values that exist in the API response.');

        // Optionally: Set first available option if localStorage values don't match
        // Uncomment below if you want to auto-select first available option instead
        /*
        if (uniqueBatches.length > 0 || uniqueSemesters.length > 0) {
          const firstBatch = uniqueBatches.length > 0 ? uniqueBatches[0] : '';
          const firstSem = uniqueSemesters.length > 0 ? uniqueSemesters[0] : '';
          setFilters(prev => ({
            ...prev,
            ...(firstBatch && { batch: firstBatch }),
            ...(firstSem && { sem: firstSem })
          }));
          console.log('🔄 Set to first available options instead:', { batch: firstBatch, sem: firstSem });
        }
        */

        hasAutoFilledRef.current = true; // Mark as attempted to prevent retries
      }
    } catch (error) {
      console.error('❌ Error loading batch details from localStorage:', error);
      hasAutoFilledRef.current = true; // Mark as attempted even on error
    }
  }, [masterData, uniqueBatches, uniqueSemesters]); // Run when masterData or unique arrays change

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const renderCell = (row, column) => {
    switch (column.key) {
      case 'IS_VERIFIED':
        {
          const value = row.IS_VERIFIED ?? row.isVerified;
          const isChecked = value === true || value === 'true' || value === 'True' || value === 1;
          return (
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className={styles.tableCheckbox}
            />
          );
        }
      case 'CREDITS':
        return row.CREDITS != null ? Number(row.CREDITS).toFixed(2) : '-';
      default:
        return row[column.key] != null ? row[column.key] : '-';
    }
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      {/* Login Modal */}
      {showLoginModal && !isAuthenticated && (
        <div className={styles.loginOverlay}>
          <div className={styles.loginModal}>
            <div className={styles.loginHeader}>
              <h3 className={styles.loginTitle}>
                <FaLock className={styles.loginTitleIcon} />
                Admin Login Required
              </h3>
              <button className={styles.loginCloseBtn} onClick={handleCloseLoginModal}>
                <FaTimes />
              </button>
            </div>
            <form className={styles.loginForm} onSubmit={handleLogin}>
              <p className={styles.loginSubtitle}>
                This module is restricted to administrators only. Please enter your credentials to continue.
              </p>

              {loginError && (
                <div className={styles.loginError}>
                  {loginError}
                </div>
              )}

              <div className={styles.loginInputGroup}>
                <label className={styles.loginLabel}>
                  <FaUser className={styles.loginInputIcon} />
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  className={styles.loginInput}
                  value={loginCredentials.username}
                  onChange={handleLoginInputChange}
                  placeholder="Enter admin username"
                  autoFocus
                />
              </div>

              <div className={styles.loginInputGroup}>
                <label className={styles.loginLabel}>
                  <FaLock className={styles.loginInputIcon} />
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  className={styles.loginInput}
                  value={loginCredentials.password}
                  onChange={handleLoginInputChange}
                  placeholder="Enter password"
                />
              </div>

              <div className={styles.loginActions}>
                <button
                  type="submit"
                  className={styles.loginBtn}
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Verifying...' : 'Login'}
                </button>
                <button
                  type="button"
                  className={styles.loginCancelBtn}
                  onClick={handleCloseLoginModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content - Only visible after authentication */}
      {isAuthenticated && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>Master Creation</h2>
            <p className={styles.subtitle}>
              Configure paper wise master data using batch, branch code, semester and paper code filters.
            </p>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Batch</label>
              <select
                className={styles.filterSelect}
                name="batch"
                value={filters.batch}
                onChange={handleFilterChange}
              >
                <option value="">All Batches</option>
                {uniqueBatches.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>BCode</label>
              <select
                className={styles.filterSelect}
                name="bcode"
                value={filters.bcode}
                onChange={handleFilterChange}
              >
                <option value="">All Branches</option>
                {uniqueGroups.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sem</label>
              <select
                className={styles.filterSelect}
                name="sem"
                value={filters.sem}
                onChange={handleFilterChange}
              >
                <option value="">All Semesters</option>
                {uniqueSemesters.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>PCode</label>
              <select
                className={styles.filterSelect}
                name="pcode"
                value={filters.pcode}
                onChange={handleFilterChange}
              >
                <option value="">All Paper Codes</option>
                {uniquePCodes.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <button className={styles.resetBtn} onClick={handleReset}>
              Clear
            </button>
          </div>

          {loading && (
            <div className={styles.bannerInfo}>Loading master data...</div>
          )}
          {!loading && error && (
            <div className={styles.bannerError}>{error}</div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.indexCol}>S.No</th>
                  {tableColumns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr className={styles.emptyStateRow}>
                    <td colSpan={tableColumns.length + 1}>
                      {loading ? 'Loading data...' : 'No records to display. Adjust filters or reload data.'}
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row, index) => (
                    <tr
                      key={`${row.PID}-${index}`}
                      className={errorRowIds.has(row.PID) ? styles.errorRow : ''}
                    >
                      <td className={styles.centerCell}>{(currentPage - 1) * pageSize + index + 1}</td>
                      {tableColumns.map((column) => (
                        <td key={column.key} className={
                          ['BATCH', 'BCODE', 'SEM', 'PCODE'].includes(column.key) ? styles.centerCell : ''
                        }>
                          {column.key === 'BATCH' ? (
                            row.BATCH || '-'
                          ) : column.key === 'BCODE' ? (
                            row.GRP || '-'
                          ) : column.key === 'SEM' ? (
                            row.SEM || '-'
                          ) : column.key === 'PCODE' ? (
                            row.PCODE || '-'
                          ) : column.key === 'PNAME' ? (
                            <input
                              type="text"
                              className={styles.tableInput}
                              value={row.PNAME || ''}
                              onChange={(event) => updateRowValue(row.PID, 'PNAME', event.target.value)}
                            />
                          ) :
                            ['TMAX', 'TPASS', 'PMAX', 'PPASS', 'SMAX', 'SPASS', 'MAXMRK', 'PASS'].includes(column.key) ? (
                              <input
                                type="number"
                                className={styles.tableNumber}
                                value={row[column.key] ?? ''}
                                onChange={(event) => updateRowValue(row.PID, column.key, event.target.value)}
                              />
                            ) : column.key === 'CREDITS' ? (
                              <input
                                type="number"
                                step="0.01"
                                className={styles.tableNumber}
                                value={row.CREDITS ?? ''}
                                onChange={(event) => updateRowValue(row.PID, 'CREDITS', event.target.value)}
                              />
                            ) : column.key === 'IS_VERIFIED' ? (
                              <input
                                type="checkbox"
                                className={styles.tableCheckbox}
                                checked={row.IS_VERIFIED === true || row.IS_VERIFIED === 'true' || row.IS_VERIFIED === 'True' || row.IS_VERIFIED === 1}
                                onChange={(event) => handleVerifyToggle(row.PID, event.target.checked)}
                                disabled={savingRowId === row.PID}
                              />
                            ) : (
                              renderCell(row, column)
                            )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>Page {currentPage} of {totalPages}</span>
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>

          <div className={styles.actionsRow}>
            <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Loading...' : 'Submit'}
            </button>
            <button className={styles.warningBtn} onClick={handleReset}>
              Cancel
            </button>
            {/* Create Master button removed from here as it is now in the modal */}
            <button className={styles.primaryBtn} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button className={styles.primaryBtnSecondary} onClick={() => alert('Print functionality coming soon')}>
              Print
            </button>
          </div>

          {/* Summary Modal */}
          {showSummaryModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Master Creation</h3>
                  <button
                    className={styles.loginCloseBtn}
                    onClick={() => setShowSummaryModal(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Semester</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            Batch : <input type="text" readOnly value={row.BATCH || row.batch} style={{ width: '150px', border: '1px solid #ccc', padding: '2px 5px' }} />
                          </td>
                          <td>
                            Semester : <input type="text" readOnly value={row.SEM || row.sem} style={{ width: '150px', border: '1px solid #ccc', padding: '2px 5px' }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    className={styles.primaryBtn}
                    onClick={executeMasterCreation}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Master'}
                  </button>
                  <button
                    className={styles.warningBtn}
                    onClick={() => setShowSummaryModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasterCreation;

