import React, { useState, useEffect, useRef } from 'react';
import { submitBiometricTemplate } from '../utils/api';
import styles from './BioMetricEntry.module.css';
import { FaFingerprint, FaUpload } from 'react-icons/fa';

const DEFAULT_WS_HOST = 'ws://127.0.0.1:21187/fps';
const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAkCAYAAABIdFAMAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHhJREFUeNo8zjsOxCAMBFB/KEAUFFR0Cbng3nQPw68ArZdAlOZppPFIBhH5EAB8b+Tlt9MYQ6i1BuqFaq1CKSVcxZ2Acs6406KUgpt5/LCKuVgz5BDCSb13ZO99ZOdcZGvt4mJjzMVKqcha68iIePB86GAiOv8CDADlIUQBs7MD3wAAAABJRU5ErkJggg==';

const BioMetricEntry = () => {
  const [status, setStatus] = useState('');
  const [imageSrc, setImageSrc] = useState(PLACEHOLDER_IMG);
  const [getFingerPrint, setGetFingerPrint] = useState('');
  const [matchFingerPrint, setMatchFingerPrint] = useState('');
  const [submitMessage, setSubmitMessage] = useState(null);
  const [submitType, setSubmitType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.WebSocket) {
      setStatus('Browser does not support WebSocket!');
      return;
    }
    setStatus(`Connecting to ${DEFAULT_WS_HOST} ...`);
    let ws;
    try {
      ws = new WebSocket(DEFAULT_WS_HOST);
      wsRef.current = ws;
    } catch (err) {
      setStatus('Connection error');
      return;
    }

    ws.onopen = () => setStatus('Connected OK!');
    ws.onmessage = (evt) => {
      try {
        const obj = JSON.parse(evt.data);
        switch (obj.workmsg) {
          case 1:
            setStatus('Please Open Device');
            break;
          case 2:
            setStatus('Place Finger');
            break;
          case 3:
            setStatus('Lift Finger');
            break;
          case 4:
            break;
          case 5:
            if (obj.retmsg === 1) {
              setStatus('Get Template OK');
              if (obj.data1 && obj.data1 !== 'null') setMatchFingerPrint(obj.data1);
              if (obj.data2 && obj.data2 !== 'null') setMatchFingerPrint(obj.data2);
            } else {
              setStatus('Get Template Fail');
            }
            break;
          case 6:
            if (obj.retmsg === 1) {
              setStatus('Enrol Template OK');
              if (obj.data1 && obj.data1 !== 'null') setGetFingerPrint(obj.data1);
              if (obj.data2 && obj.data2 !== 'null') setGetFingerPrint(obj.data2);
            } else {
              setStatus('Enrol Template Fail');
            }
            break;
          case 7:
            if (obj.image && obj.image !== 'null') {
              setImageSrc(`data:image/png;base64,${obj.image}`);
            }
            break;
          case 8:
            setStatus('Time Out');
            break;
          case 9:
            setStatus(`Match Result: ${obj.retmsg}`);
            break;
          default:
            break;
        }
      } catch (e) {
        setStatus('Parse error');
      }
    };
    ws.onclose = () => setStatus('Closed!');
    ws.onerror = () => setStatus('Connection error');

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const sendCommand = (cmd, data1 = '', data2 = '') => {
    const payload = JSON.stringify({ cmd, data1, data2 });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    }
  };

  const handleEnrolTemplate = () => {
    sendCommand('enrol', '', '');
    setStatus('Place Finger');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitMessage(null);
    const template = getFingerPrint || matchFingerPrint;
    if (!template) {
      setSubmitMessage('No fingerprint template captured. Use Enrol Template first.');
      setSubmitType('error');
      setSubmitting(false);
      return;
    }
    try {
      const res = await submitBiometricTemplate(template);
      setSubmitMessage(res?.message || 'Submitted successfully.');
      setSubmitType('success');
    } catch (e) {
      setSubmitMessage(e?.message || 'Submit failed or backend not configured.');
      setSubmitType('error');
    }
    setSubmitting(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className={styles.boxHeader}>
          <h2><FaFingerprint className={styles.headerIcon} /> Fingerprint Entry</h2>
        </div>
        <div className={styles.boxContent}>
          <div className={styles.formSection} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <img
                src={imageSrc}
                alt="Fingerprint"
                width={200}
                height={220}
                style={{ objectFit: 'contain', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <div className={styles.formGroup} style={{ width: '100%' }}>
              <label className={styles.label}>Scanner Status</label>
              <input
                type="text"
                className={styles.input}
                value={status}
                readOnly
                placeholder="Status"
                style={{ textAlign: 'center', fontWeight: '500', color: status.includes('error') ? '#dc2626' : '#0284c7', background: '#f8fafc' }}
              />
            </div>

            <div className={styles.actionButtons} style={{ width: '100%', justifyContent: 'center', gap: '16px' }}>
              <button
                type="button"
                className={styles.getDataBtn}
                onClick={handleEnrolTemplate}
                disabled={status === 'Closed!' || status.startsWith('Connection')}
                style={{ alignSelf: 'center', margin: 0 }}
              >
                <FaFingerprint /> Enrol Template
              </button>
              
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSubmit}
                disabled={submitting}
              >
                <FaUpload /> Submit
              </button>
            </div>

          </div>

          {submitMessage && (
            <div className={`${styles.message} ${styles[`message${submitType === 'success' ? 'Success' : submitType === 'error' ? 'Error' : 'Info'}`]}`} style={{ marginTop: '16px', marginBottom: 0 }}>
              {submitMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BioMetricEntry;
