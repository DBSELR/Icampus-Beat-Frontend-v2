import React, { useState, useEffect, useMemo } from 'react';
import { FaUser, FaChevronUp } from 'react-icons/fa';
import globalStyles from './Results.module.css';
import { loadOmrNumberGrid, updateOmrNumbers, getAppData } from '../utils/api';

const OmrNumberUpdate = () => {
  const appData = getAppData() || {};
  const regulation = appData.regulation || '';
  const course = appData.course || '';
  const exammy = appData.examMY || '';

  const [regNoFilter, setRegNoFilter] = useState('');
  const [allData, setAllData] = useState([]);
  const [editMap, setEditMap] = useState({});   // ashId → omrNumber (edited values)
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Load full exam data on mount
  useEffect(() => {
    if (!regulation || !course || !exammy) return;
    setLoading(true);
    loadOmrNumberGrid(regulation, course, exammy)
      .then((res) => {
        const data = res?.data ?? res;
        setAllData(Array.isArray(data) ? data : []);
      })
      .catch((err) => showMessage(err.message || 'Failed to load data.', 'error'))
      .finally(() => setLoading(false));
  }, [regulation, course, exammy]);

  // Filter rows by RegNo input
  const filteredRows = useMemo(() => {
    const filter = regNoFilter.trim().toUpperCase();
    if (!filter) return allData;
    return allData.filter((r) => {
      const rn = (r.REGNO || r.regno || '').toUpperCase();
      return rn.includes(filter);
    });
  }, [allData, regNoFilter]);

  const rowKey = (row) => `${row.REGNO ?? ''}__${row.PCODE ?? ''}`;

  const getOmrValue = (row) => {
    const key = rowKey(row);
    if (editMap[key] !== undefined) return editMap[key];
    return row.OMRNUMBER ?? row.omrNumber ?? row.omrnumber ?? '';
  };

  const handleOmrInputChange = (key, value) => {
    setEditMap((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (filteredRows.length === 0) {
      showMessage('No data to update.', 'error');
      return;
    }

    const payload = filteredRows.map((row) => ({
      Regno:  String(row.REGNO  ?? row.regno  ?? ''),
      PCode:  String(row.PCODE  ?? row.pCode  ?? row.PCode  ?? ''),
      ExamMY: String(row.EXAMMY ?? row.exammy ?? exammy),
      OmrNo:  String(getOmrValue(row)),
    }));

    for (const p of payload) {
      if (!p.OmrNo.trim()) {
        showMessage('PLEASE ENTER OMR NUMBER..', 'error');
        return;
      }
    }

    setUpdating(true);
    try {
      const res = await updateOmrNumbers(payload);
      if (res.success) {
        showMessage(res.message || 'OMR NUMBER UPDATED SUCCESSFULLY.', 'success');
      } else {
        showMessage(res.message || 'Update failed.', 'error');
      }
    } catch (err) {
      showMessage(err.message || 'Update failed.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={globalStyles.container}>
      <div className={globalStyles.box}>
        <div className={globalStyles.boxHeader}>
          <h2>
            <FaUser className={globalStyles.headerIcon} />
            OMR NUMBER Update
          </h2>
          <button
            className={`${globalStyles.minimizeBtn} ${isFormCollapsed ? globalStyles.rotated : ''}`}
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          >
            <FaChevronUp />
          </button>
        </div>

        <div className={`${globalStyles.boxContent} ${isFormCollapsed ? globalStyles.collapsed : ''}`}>
          {message.text && (
            <div style={{
              margin: '0 auto 24px',
              padding: '12px 20px',
              maxWidth: '600px',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '600',
              color: message.type === 'error' ? '#991b1b' : '#166534',
              backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            }}>
              {message.text}
            </div>
          )}

          <div className={globalStyles.formSection}>
            <div className={globalStyles.formRow}>
              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Filter by Regno</label>
                <input
                  type="text"
                  value={regNoFilter}
                  onChange={(e) => setRegNoFilter(e.target.value.toUpperCase())}
                  className={globalStyles.input}
                  placeholder="Enter Registration No."
                  style={{ fontWeight: 'bold', color: 'indianred', textTransform: 'uppercase' }}
                />
              </div>

              <div className={globalStyles.formGroup}>
                <label className={globalStyles.label}>Total Rows</label>
                <input
                  type="text"
                  value={loading ? 'Loading...' : `${filteredRows.length} / ${allData.length}`}
                  readOnly
                  className={globalStyles.input}
                  style={{ fontWeight: 'bold', color: '#64748b', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>

              <div className={globalStyles.formGroup} style={{ justifyContent: 'flex-end' }}>
                <button
                  onClick={handleUpdate}
                  className={`${globalStyles.btn} ${globalStyles.saveBtn}`}
                  disabled={updating || filteredRows.length === 0}
                  style={{ minWidth: '150px' }}
                >
                  {updating ? 'UPDATING...' : 'UPDATE OMRNUMBER'}
                </button>
              </div>
            </div>
          </div>

          {/* Data Table Section */}
          <div style={{ marginTop: '24px' }}>
            {loading ? (
              <div className={globalStyles.noDataMessage}>Loading...</div>
            ) : (
              <div className={globalStyles.tableWrapper} style={{ maxHeight: '450px' }}>
                <table className={globalStyles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>REGNO</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>BRANCH</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>SEM</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>PCode</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>TempCode</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>PName</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>OMRNUMBER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#888' }}>
                          {allData.length === 0 ? 'No data loaded' : 'No records match the filter'}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => {
                        return (
                          <tr key={rowKey(row) + idx}>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{row.REGNO ?? ''}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{row.GRP ?? ''}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{row.SEM ?? ''}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{row.PCODE ?? ''}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{row.TEMPCODE ?? ''}</td>
                            <td style={{ textAlign: 'center' }}>{row.PNAME ?? ''}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="text"
                                value={getOmrValue(row)}
                                onChange={(e) => handleOmrInputChange(rowKey(row), e.target.value)}
                                className={globalStyles.input}
                                style={{ width: '100px', margin: '0 auto', textAlign: 'center', padding: '6px 12px', minHeight: '36px' }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OmrNumberUpdate;
