import React, { useState, useEffect } from 'react';
import { FaListAlt } from 'react-icons/fa';
import styles from './Results.module.css';
import {
  getPendingListInternal,
  getPendingListPractical,
  getPendingListTheory,
  getPendingListRv,
  getAppData,
} from '../utils/api';

const PendingList = () => {
  const [selectedPendingType, setSelectedPendingType] = useState('internal');
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (type) => {
    const appData = getAppData();
    const examMy = appData?.examMY || '';
    const course = appData?.course || '';
    const regulation = appData?.regulation || '';

    setLoading(true);
    setError('');
    setTableData([]);
    setColumns([]);

    try {
      let response;
      switch (type) {
        case 'internal':
          response = await getPendingListInternal(examMy, course, regulation);
          break;
        case 'practical':
          response = await getPendingListPractical(examMy, course, regulation);
          break;
        case 'theory':
          response = await getPendingListTheory(examMy, course, regulation);
          break;
        case 'rv':
          response = await getPendingListRv(examMy, course, regulation);
          break;
        default:
          return;
      }

      const data = response?.data ?? response;
      if (Array.isArray(data) && data.length > 0) {
        const cols = Object.keys(data[0]);
        setColumns(cols);
        setTableData(data);
      } else {
        setTableData([]);
        setColumns([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPendingType);
  }, []);

  const handlePendingTypeChange = (type) => {
    setSelectedPendingType(type);
    fetchData(type);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaListAlt className={styles.headerIcon} /> Pending List</h2>
        </div>
        <div className={styles.boxContent}>
          
          <div className={styles.formSection}>
            <div className={styles.formRow} style={{ justifyContent: 'space-around', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="pendingList"
                  value="internal"
                  checked={selectedPendingType === 'internal'}
                  onChange={() => handlePendingTypeChange('internal')}
                />
                Internal Pending
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="pendingList"
                  value="practical"
                  checked={selectedPendingType === 'practical'}
                  onChange={() => handlePendingTypeChange('practical')}
                />
                Practical Pending
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="pendingList"
                  value="theory"
                  checked={selectedPendingType === 'theory'}
                  onChange={() => handlePendingTypeChange('theory')}
                />
                Theory Pending
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                <input
                  type="radio"
                  name="pendingList"
                  value="rv"
                  checked={selectedPendingType === 'rv'}
                  onChange={() => handlePendingTypeChange('rv')}
                />
                RV Pending
              </label>
            </div>
          </div>

          {loading ? (
            <div className={styles.noDataMessage}>Loading...</div>
          ) : error ? (
            <div className={styles.noDataMessage} style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}>{error}</div>
          ) : tableData.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {columns.map((col) => (
                        <td key={col}>{row[col] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noDataMessage}>No pending items found.</div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PendingList;
