import React, { useState, useEffect } from 'react';
import { getAppData } from '../utils/api';
import { getExportToPortalBatches, getExportToPortalSems, exportToPortal } from '../utils/api';
import styles from './ExportToStdPortal.module.css';
import { FaUpload } from 'react-icons/fa';

const REGSUP_OPTIONS = [
  { value: '0', text: 'Select RegSup' },
  { value: '1', text: 'REG' },
  { value: '2', text: 'SUP' },
];

const ExportToStdPortal = () => {
  const [batchList, setBatchList] = useState([]);
  const [semList, setSemList] = useState([]);
  const [batch, setBatch] = useState('');
  const [sem, setSem] = useState('');
  const [regSup, setRegSup] = useState('0');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingSem, setLoadingSem] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');

  const appData = getAppData();
  const course = appData?.course || '';

  useEffect(() => {
    if (!course) {
      setBatchList([]);
      setBatch('');
      return;
    }
    setLoadingBatch(true);
    getExportToPortalBatches(course)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((b) => (typeof b === 'string' ? { value: b, text: b } : { value: b.batch || b.BATCH || b.value || String(b), text: b.text || b.batch || b.BATCH || String(b) }));
          setBatchList(list);
          if (list.length && !batch) setBatch(list[0].value);
        }
      })
      .finally(() => setLoadingBatch(false));
  }, [course]);

  useEffect(() => {
    if (!batch) {
      setSemList([]);
      setSem('');
      return;
    }
    setLoadingSem(true);
    getExportToPortalSems(batch)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((s) => (typeof s === 'object' ? { value: s.value || s.sem || String(s.sem), text: s.text || String(s.sem || s.value) } : { value: String(s), text: String(s) }));
          setSemList(list);
          if (list.length && !sem) setSem(list[0].value);
        }
      })
      .finally(() => setLoadingSem(false));
  }, [batch]);

  const runExport = async (exportType) => {
    if (!batch || !sem) {
      setMessage('Please select BATCH and SEM.');
      setMessageType('error');
      return;
    }
    if (regSup === '0') {
      setMessage('Please select REGSUP.');
      setMessageType('error');
      return;
    }
    setActionLoading(exportType);
    setMessage(null);
    try {
      const res = await exportToPortal(batch, sem, regSup, exportType);
      setMessage(res?.message || 'Export completed.');
      setMessageType('success');
    } catch (e) {
      setMessage(e?.message || 'Export failed or backend not configured.');
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2><FaUpload className={styles.headerIcon} /> Export to Student Portal</h2>
        </div>
        <div className={styles.boxContent}>
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>BATCH</label>
                <select
                  className={styles.select}
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  disabled={loadingBatch || !course}
                >
                  <option value="">Select Batch</option>
                  {batchList.map((b) => (
                    <option key={b.value} value={b.value}>{b.text}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>SEM</label>
                <select
                  className={styles.select}
                  value={sem}
                  onChange={(e) => setSem(e.target.value)}
                  disabled={loadingSem || !batch}
                >
                  <option value="">Select Sem</option>
                  {semList.map((s) => (
                    <option key={s.value} value={s.value}>{s.text}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>REGSUP</label>
                <select
                  className={styles.select}
                  value={regSup}
                  onChange={(e) => setRegSup(e.target.value)}
                >
                  {REGSUP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.text}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.actionButtons} style={{ marginTop: '16px' }}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => runExport('tables1')}
                disabled={!!actionLoading}
              >
                <FaUpload /> {actionLoading === 'tables1' ? 'Exporting...' : 'Tables Export 1'}
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => runExport('tables2')}
                disabled={!!actionLoading}
              >
                <FaUpload /> {actionLoading === 'tables2' ? 'Exporting...' : 'Tables Export 2'}
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => runExport('rcrv')}
                disabled={!!actionLoading}
              >
                <FaUpload /> {actionLoading === 'rcrv' ? 'Exporting...' : 'RCRV'}
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => runExport('subjectdata')}
                disabled={!!actionLoading}
              >
                <FaUpload /> {actionLoading === 'subjectdata' ? 'Exporting...' : 'Only Subject Data'}
              </button>
            </div>
            
            {!course && <div className={styles.noDataMessage} style={{ padding: '20px' }}>Select Course (e.g. from dropdown) to load batches.</div>}
            
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

export default ExportToStdPortal;

