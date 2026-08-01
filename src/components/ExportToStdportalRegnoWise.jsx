import React, { useState } from 'react';
import { exportToPortalRegnoWise } from '../utils/api';
import styles from './ExportToStdportalRegnoWise.module.css';
import { FaUpload } from 'react-icons/fa';

const ExportToStdportalRegnoWise = () => {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');

  const handleExport = async () => {
    const trimmed = regNo?.trim();
    if (!trimmed) {
      setMessage('Please enter Regno.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await exportToPortalRegnoWise(trimmed);
      setMessage(res?.message || 'Export to portal completed.');
      setMessageType('success');
    } catch (e) {
      setMessage(e?.message || 'Export failed or backend not configured.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaUpload className={styles.headerIcon} /> Export to Student Portal RegnoWise</h2>
        </div>
        <div className={styles.boxContent}>
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="regno">Registration Number</label>
                <input
                  id="regno"
                  type="text"
                  className={styles.input}
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="Enter Regno"
                />
              </div>
              <div className={styles.formGroup} style={{ alignSelf: 'flex-end', flex: '0 0 auto' }}>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={handleExport}
                  disabled={loading}
                >
                  <FaUpload /> {loading ? 'Exporting...' : 'Export To Portal'}
                </button>
              </div>
            </div>
            
            {message && (
              <div className={`${styles.message} ${messageType === 'success' ? styles.messageSuccess : styles.messageError}`} style={{ marginTop: '16px', marginBottom: 0 }}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportToStdportalRegnoWise;
