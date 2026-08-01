import React, { useState, useEffect, useCallback } from 'react';
import styles from './MidHallTickets.module.css';
import { getAppData, prepareMidHallTickets, getMidHallTicketData } from '../utils/api';

const MidHallTickets = () => {
  const [filters, setFilters] = useState({
    batch: '',
    semester: '',
    branch: '',
    htNo: '',
    examType: ''
  });

  const [hallTicketData, setHallTicketData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState('');
  const [autoPrint, setAutoPrint] = useState(false);
  const [appData, setAppData] = useState(null);

  // ExamType options - only MID-I and MID-II for Mid Hall Tickets
  const examTypeOptions = [
    { value: '', label: 'Select ExamType' },
    { value: 'MID-I', label: 'MID-I' },
    { value: 'MID-II', label: 'MID-II' }
  ];

  // Fetch app data on component mount
  useEffect(() => {
    const data = getAppData();
    if (data) {
      setAppData(data);
    }
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Handle View button - Two-step process: Prepare first, then get data
  const handleView = async () => {
    // Validate required fields
    if (!filters.examType) {
      alert('Please select ExamType');
      return;
    }

    if (!appData?.course || !appData?.examMY || !appData?.regulation) {
      alert('Please select Course, Exam M/Y, and Regulation from the header dropdowns');
      return;
    }

    setIsLoading(true);
    setIsPreparing(true);
    setError('');
    setHasData(false);
    setHallTicketData([]);

    try {
      // Step 1: Prepare mid hall tickets
      console.log('Step 1: Preparing mid hall tickets...');
      const prepareRequest = {
        examMY: appData.examMY,
        course: appData.course,
        regulation: appData.regulation,
        sem: filters.semester || '',
        batch: filters.batch || '',
        branch: filters.branch || '',
        regno: filters.htNo || '',
        examType: filters.examType
      };

      console.log('Prepare Request:', prepareRequest);

      const prepareResponse = await prepareMidHallTickets(prepareRequest);

      if (!prepareResponse.success) {
        throw new Error(prepareResponse.message || 'Failed to prepare mid hall tickets');
      }

      console.log('Step 1 Complete: Mid hall tickets prepared successfully');
      console.log('Rows affected:', prepareResponse.data?.rowsAffected);

      // Step 2: Get mid hall ticket data
      setIsPreparing(false);
      console.log('Step 2: Fetching mid hall ticket data...');

      const dataParams = {
        examMY: appData.examMY,
        course: appData.course,
        regulation: appData.regulation,
        sem: filters.semester || null,
        batch: filters.batch || null,
        branch: filters.branch || null,
        regno: filters.htNo || null,
        examType: filters.examType || null
      };

      console.log('Data Request Params:', dataParams);

      const dataResponse = await getMidHallTicketData(dataParams);

      if (dataResponse && dataResponse.success && Array.isArray(dataResponse.data)) {
        setHallTicketData(dataResponse.data);
        setHasData(dataResponse.data.length > 0);
        if (dataResponse.data.length === 0) {
          setError('No mid hall ticket data found for the selected criteria');
        }
      } else {
        setError(dataResponse?.message || 'No mid hall ticket data found');
        setHasData(false);
      }
    } catch (err) {
      console.error('Error in handleView:', err);
      setError(err.message || 'Failed to load mid hall tickets. Please try again.');
      setHasData(false);
    } finally {
      setIsLoading(false);
      setIsPreparing(false);
    }
  };

  // Convert JSON to CSV
  const convertJsonToCsv = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.map(h => `"${h}"`).join(',')];

    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  // Download CSV file
  const downloadCsv = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  // Handle Download button
  const handleDownload = async () => {
    if (hallTicketData.length === 0) {
      alert('No data to download. Please click View first.');
      return;
    }

    try {
      const csvContent = convertJsonToCsv(hallTicketData);
      const filename = `MidHallTickets_${appData?.course || 'Data'}_${filters.examType || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCsv(csvContent, filename);
      alert(`Mid Hall Tickets data downloaded successfully! (${hallTicketData.length} records)`);
    } catch (err) {
      console.error('Error downloading mid hall ticket data:', err);
      alert('Failed to download mid hall ticket data');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h3>Mid Hall Tickets</h3>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Batch</label>
              <input
                type="text"
                name="batch"
                value={filters.batch}
                onChange={handleFilterChange}
                className={styles.input}
                placeholder="Enter Batch"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Semester</label>
              <input
                type="text"
                name="semester"
                value={filters.semester}
                onChange={handleFilterChange}
                className={styles.input}
                placeholder="Enter Semester"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>Branch</label>
              <input
                type="text"
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                className={styles.input}
                placeholder="Enter Branch"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>H.T.No</label>
              <input
                type="text"
                name="htNo"
                value={filters.htNo}
                onChange={handleFilterChange}
                className={styles.input}
                placeholder="Enter H.T.No"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>ExamType</label>
              <select
                name="examType"
                value={filters.examType}
                onChange={handleFilterChange}
                className={styles.select}
              >
                {examTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionsGroup}>
              <button 
                className={styles.viewBtn} 
                onClick={handleView} 
                disabled={isLoading || !filters.examType}
              >
                {isPreparing ? 'Preparing...' : isLoading ? 'Loading…' : 'View'}
              </button>
              <button 
                className={styles.downloadBtn} 
                onClick={handleDownload} 
                disabled={isLoading || !hasData || hallTicketData.length === 0}
              >
                Download
              </button>
            </div>
          </div>

          <label className={styles.printReminder}>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(event) => setAutoPrint(event.target.checked)}
            />
            Click Here To Print Or Export after loading the Report
          </label>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.reportArea}>
        {!hasData && !isLoading && !error && (
          <div className={styles.placeholder}>
            Select the required filters (at least ExamType) and click View to load the mid hall tickets.
          </div>
        )}
        {isPreparing && (
          <div className={styles.loadingState}>
            Preparing mid hall tickets... This may take a moment.
          </div>
        )}
        {isLoading && !isPreparing && (
          <div className={styles.loadingState}>Loading mid hall ticket data…</div>
        )}
        {hasData && !isLoading && hallTicketData.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {Object.keys(hallTicketData[0] || {}).map((key, index) => (
                    <th key={index}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hallTicketData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(hallTicketData[0] || {}).map((key, colIndex) => (
                      <td key={colIndex}>
                        {row[key] !== null && row[key] !== undefined ? String(row[key]) : ''}
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
  );
};

export default MidHallTickets;
