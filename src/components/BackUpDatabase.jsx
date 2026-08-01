import React, { useState } from 'react';
import { backupDatabase } from '../utils/api';
import styles from './BackUpDatabase.module.css';
import { FaDatabase } from 'react-icons/fa';

const BackUpDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await backupDatabase();
      if (res && (res.success || res.message)) {
        setMessage(res.message || 'Backup completed successfully.');
        setMessageType('success');
      } else {
        setMessage('Backup request sent.');
        setMessageType('info');
      }
    } catch (e) {
      setMessage(e.message || 'Backup is not available or failed.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaDatabase className={styles.headerIcon} /> Backup Database</h2>
        </div>
        <div className={styles.boxContent}>
          <div className={styles.formSection}>
            <div className={styles.formRow} style={{ justifyContent: 'center', padding: '20px 0' }}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleBackup}
                disabled={loading}
                style={{ padding: '12px 30px', fontSize: '15px' }}
              >
                <FaDatabase /> {loading ? 'Please wait...' : 'BackUp Database'}
              </button>
            </div>
            {message && (
              <div className={`${styles.message} ${messageType === 'success' ? styles.messageSuccess : styles.messageError}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackUpDatabase;
