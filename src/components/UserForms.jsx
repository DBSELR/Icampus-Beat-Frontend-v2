import React, { useState, useEffect, useMemo } from 'react';
import { menuData } from './Sidebar.jsx';
import { getUserGroups, getUserGroupForms, saveUserForms, deleteUserGroup } from '../utils/api';
import styles from './UserForms.module.css';
import { FaUsers, FaTrash, FaSave, FaShieldAlt } from 'react-icons/fa';

const STORAGE_KEY = 'icampus_user_forms';

function getFlattenedForms() {
  const list = [];
  let menuId = 0;
  menuData.forEach((menu) => {
    if (menu.hasSubmenu && menu.submenu && menu.submenu.length) {
      menu.submenu.forEach((sub) => {
        const subMenuId = sub.url || `${menuId}-${sub.text}`;
        list.push({
          menuId: String(menuId),
          subMenuId,
          text: `${menu.text} > ${sub.text}`, // Added parent menu name
          url: sub.url,
        });
      });
      menuId += 1;
    }
  });
  return list;
}

const UserForms = () => {
  const [userGroupName, setUserGroupName] = useState('');
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [userGroupsList, setUserGroupsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allForms = useMemo(() => getFlattenedForms(), []);

  const assignedForms = useMemo(
    () => allForms.filter((f) => selectedFormIds.includes(f.subMenuId)),
    [allForms, selectedFormIds]
  );

  const filteredForms = useMemo(() => {
    if (!searchTerm) return allForms;
    const lower = searchTerm.toLowerCase();
    return allForms.filter(f => f.text.toLowerCase().includes(lower));
  }, [allForms, searchTerm]);

  const loadUserGroups = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getUserGroups();
      if (res.success && Array.isArray(res.data)) setUserGroupsList(res.data);
      else setUserGroupsList([]);
    } catch (e) {
      setMessage('Failed to load user groups.');
      setUserGroupsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserGroups();
  }, []);

  const loadAssignedFormsForGroup = async (groupName) => {
    if (!groupName || !groupName.trim()) {
      setSelectedFormIds([]);
      return;
    }
    try {
      const fromApi = await getUserGroupForms(groupName.trim());
      if (fromApi && fromApi.length > 0) {
        const ids = fromApi.map((f) => f.subMenuId || f.url || f.SubMenuID).filter(Boolean);
        setSelectedFormIds(ids);
        return;
      }
    } catch (_) { }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      const ids = stored[groupName.trim()] || [];
      setSelectedFormIds(Array.isArray(ids) ? ids : []);
    } catch (_) {
      setSelectedFormIds([]);
    }
  };

  const handleGroupChange = (e) => {
    setUserGroupName(e.target.value);
    setMessage(null);
  };

  const handleGroupBlur = () => {
    loadAssignedFormsForGroup(userGroupName);
  };

  const handleSelectGroup = (group) => {
    setUserGroupName(group);
    setMessage(null);
    loadAssignedFormsForGroup(group);
  };

  const handleCheckboxToggle = (subMenuId) => {
    setSelectedFormIds(prev => {
      if (prev.includes(subMenuId)) {
        return prev.filter(id => id !== subMenuId);
      } else {
        return [...prev, subMenuId];
      }
    });
  };

  const handleSave = async () => {
    const group = userGroupName.trim();
    if (!group) {
      setMessage('Please enter User Group.');
      return;
    }
    setSaving(true);
    setMessage(null);
    const forms = assignedForms.map((f) => ({ menuId: f.menuId, subMenuId: f.subMenuId, text: f.text }));
    try {
      await saveUserForms(group, forms);
      setMessage('User forms saved successfully.');
      loadUserGroups();
    } catch (_) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || '{}';
        const stored = JSON.parse(raw);
        stored[group] = selectedFormIds;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        setMessage('User forms saved successfully (local).');
        loadUserGroups();
      } catch (e) {
        setMessage('Failed to save user forms.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm('Are you sure to delete this user group?')) return;
    setMessage(null);
    try {
      await deleteUserGroup(group);
      setMessage('User group deleted successfully.');
      if (userGroupName.trim() === group) {
        setUserGroupName('');
        setSelectedFormIds([]);
      }
      loadUserGroups();
    } catch (_) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || '{}';
        const stored = JSON.parse(raw);
        delete stored[group];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        setMessage('User group deleted successfully (local).');
        if (userGroupName.trim() === group) {
          setUserGroupName('');
          setSelectedFormIds([]);
        }
        loadUserGroups();
      } catch (e) {
        setMessage('Failed to delete user group.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

        {/* Main Panel: User Rights Configuration */}
        <div className={styles.box} style={{ flex: '1 1 500px' }}>
          <div className={styles.boxHeader}>
            <h2><FaShieldAlt className={styles.headerIcon} /> User Rights Configuration</h2>
          </div>
          <div className={styles.boxContent}>
            <div className={styles.formSection}>
              {message && (
                <div className={`${styles.message} ${message.startsWith('Failed') || message.includes('Please') ? styles.messageError : styles.messageSuccess}`}>
                  {message}
                </div>
              )}

              <div className={styles.formRow} style={{ marginBottom: '20px' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>User Group Name</label>
                  <input
                    type="text"
                    id="txtUserGroup"
                    maxLength={32}
                    className={styles.input}
                    placeholder="Enter User Group"
                    value={userGroupName}
                    onChange={handleGroupChange}
                    onBlur={handleGroupBlur}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', width: '100%' }}>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: 0 }}>
                  <label className={styles.label}>Available Forms</label>
                  <input
                    type="text"
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.input}
                    style={{ marginBottom: '10px', fontSize: '13px', padding: '6px 10px' }}
                  />
                  <div style={{ height: '350px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                    {filteredForms.map((f) => (
                      <label key={f.subMenuId} className={styles.radioLabel} style={{ display: 'flex', width: '100%', marginBottom: '4px', padding: '4px 8px' }}>
                        <input
                          type="checkbox"
                          checked={selectedFormIds.includes(f.subMenuId)}
                          onChange={() => handleCheckboxToggle(f.subMenuId)}
                          style={{ marginRight: '8px', width: '14px', height: '14px', accentColor: 'var(--theme-color)', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '11.5px' }}>{f.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ flex: 1, minWidth: 0 }}>
                  <label className={styles.label}>Assigned Forms ({assignedForms.length})</label>
                  <div style={{ height: '350px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                    {assignedForms.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '11.5px', textAlign: 'center', padding: '20px' }}>No forms assigned yet.</div>
                    ) : (
                      assignedForms.map((f) => (
                        <div key={f.subMenuId} style={{ background: '#fff', border: '1px solid #e9edf2', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', fontSize: '11.5px', color: '#1e293b' }}>
                          ✓ {f.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.updateButtonContainer}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save Group Rights'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Existing Groups */}
        <div className={styles.box} style={{ flex: '0 0 340px' }}>
          <div className={styles.boxHeader} style={{ background: '#0f172a' }}>
            <h2><FaUsers className={styles.headerIcon} /> Existing Groups</h2>
          </div>
          <div className={styles.boxContent} style={{ padding: '16px' }}>
            {loading ? (
              <div className={styles.loadingMessage}>Loading groups...</div>
            ) : userGroupsList.length === 0 ? (
              <div className={styles.noDataMessage}>No user groups found</div>
            ) : (
              <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                {userGroupsList.map((ug, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectGroup(ug)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--theme-color)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        textAlign: 'left',
                        fontSize: '13px',
                        wordBreak: 'break-word',
                        flex: 1,
                        padding: 0
                      }}
                    >
                      {ug}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(ug)}
                      title="Delete user group"
                      style={{
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: '1px solid #fca5a5',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '12px',
                        flexShrink: 0
                      }}
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserForms;

