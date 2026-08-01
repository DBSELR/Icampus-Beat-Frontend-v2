import React, { useState, useEffect } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import { getRvClosingDates, updateRvClosingDate, getAppData } from '../utils/api';

const RvClosingDates = () => {
  const appData    = getAppData() || {};
  const regulation = appData.regulation || '';
  const course     = appData.course     || '';
  const examMY     = appData.examMY     || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!regulation || !course || !examMY) return;
    setLoading(true);
    getRvClosingDates(regulation, course, examMY)
      .then((res) => {
        const data = res?.data ?? res;
        setRows(Array.isArray(data) ? data.map((r, i) => ({ ...r, _id: i })) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [regulation, course, examMY]);

  const getField = (row, ...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k];
    }
    return '';
  };

  const toDateValue = (val) => {
    if (!val) return '';
    // handles "2026-03-11T00:00:00" or "2026-03-11" → "2026-03-11"
    return String(val).substring(0, 10);
  };

  const handleDateChange = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (idx) => {
    const row = rows[idx];
    const payload = {
      regulation: getField(row, 'regulation', 'REGULATION'),
      course: getField(row, 'course', 'COURSE'),
      examMY: getField(row, 'examMY', 'EXAMMY', 'examMy'),
      sem: getField(row, 'sem', 'SEM'),
      rvCloseDate: toDateValue(row._rvCloseDate ?? getField(row, 'rvCloseDate', 'RV_CLOSEDATE', 'rv_closedate')),
      rvCDateSup: toDateValue(row._rvCDateSup ?? getField(row, 'rvCDateSup', 'RV_CDATE_SUP', 'rv_cdate_sup')),
    };
    setSavingId(idx);
    try {
      await updateRvClosingDate(payload);
      alert('Saved successfully.');
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2><FaCalendarAlt className={globalStyles.headerIcon} /> RV Closing Dates</h2>
        </div>
        <div className={globalStyles.boxContent}>
          {loading ? (
            <div className={globalStyles.noDataMessage}>Loading...</div>
          ) : rows.length === 0 ? (
            <div className={globalStyles.noDataMessage}>No data available.</div>
          ) : (
            <div className={globalStyles.tableWrapper}>
              <table className={globalStyles.dataTable}>
                <thead>
                  <tr>
                    <th>Regulation</th>
                    <th>Programme</th>
                    <th>Exam Month &amp; Year</th>
                    <th>Semester</th>
                    <th>Reg. Rv Closed Dt.</th>
                    <th>Suppl. Rv Closed Dt.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{getField(row, 'regulation', 'REGULATION')}</td>
                      <td style={{ textAlign: 'center' }}>{getField(row, 'course', 'COURSE')}</td>
                      <td style={{ textAlign: 'center' }}>{getField(row, 'examMY', 'EXAMMY', 'examMy')}</td>
                      <td style={{ textAlign: 'center' }}>{getField(row, 'sem', 'SEM')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="date"
                          value={toDateValue(row._rvCloseDate ?? getField(row, 'rvCloseDate', 'RV_CLOSEDATE', 'rv_closedate'))}
                          onChange={(e) => handleDateChange(idx, '_rvCloseDate', e.target.value)}
                          className={globalStyles.input}
                          style={{ padding: '6px 12px', minHeight: '36px', maxWidth: '160px', margin: '0 auto' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="date"
                          value={toDateValue(row._rvCDateSup ?? getField(row, 'rvCDateSup', 'RV_CDATE_SUP', 'rv_cdate_sup'))}
                          onChange={(e) => handleDateChange(idx, '_rvCDateSup', e.target.value)}
                          className={globalStyles.input}
                          style={{ padding: '6px 12px', minHeight: '36px', maxWidth: '160px', margin: '0 auto' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                          onClick={() => handleSubmit(idx)}
                          disabled={savingId === idx}
                          style={{ minWidth: '100px' }}
                        >
                          {savingId === idx ? '...' : 'Submit'}
                        </button>
                      </td>
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

export default RvClosingDates;
