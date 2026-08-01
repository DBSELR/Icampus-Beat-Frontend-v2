import React, { useState, useEffect } from 'react';
import { FaUser, FaCog, FaChevronUp, FaTimes } from 'react-icons/fa';
import { getRoomList, saveRoom, deleteRoom, getAppData } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './RoomMaster.module.css';

const RoomMaster = () => {
  const { getCurrentThemeColor } = useTheme();
  const themeColor = getCurrentThemeColor();
  // Form data state
  const [formData, setFormData] = useState({
    session: '1',
    roomNo: '',
    roomType: 'General',
    noOfBranches: '4',
    rows: '8',
    columns: '4',
    capacity: '32'
  });

  // Room list data state
  const [roomList, setRoomList] = useState([]);
  
  // Data loading state
  const [roomListLoading, setRoomListLoading] = useState(false);
  
  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Delete loading state
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Selected room state
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Dropdown options
  const sessionOptions = [
    { value: '1', text: '1' },
    { value: '2', text: '2' }
  ];

  const roomTypeOptions = [
    { value: 'General', text: 'General' },
    { value: 'Drawing Hall', text: 'Drawing Hall' }
  ];

  // Fetch room list from API
  const fetchRoomList = async () => {
    setRoomListLoading(true);
    try {
      const response = await getRoomList(formData.session);

      if (response.success && response.data) {
        // Map API response to room list format
        const mappedData = response.data.map((item) => {
          return {
            id: item.ID,
            priority: item.PRIORITY,
            roomNo: item.ROOMNO,
            capacity: `${item.CAPACITY}${item.DETAILS}`, // e.g., "40 (10 X 4)"
            session: item.DaySession,
            roomType: item.RoomType,
            noOfRows: item.NOOFROWS,
            noOfColumns: item.NOOFCOLUMNS,
            totalCapacity: item.CAPACITY
          };
        });

        setRoomList(mappedData);
        console.log('Room list loaded:', mappedData);
      } else {
        setRoomList([]);
      }
    } catch (error) {
      console.error('Error fetching room list:', error);
      setRoomList([]);
    } finally {
      setRoomListLoading(false);
    }
  };

  // Load room list when session changes
  useEffect(() => {
    fetchRoomList();
  }, [formData.session]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate capacity when rows or columns change
    if (name === 'rows' || name === 'columns') {
      const rows = name === 'rows' ? value : formData.rows;
      const columns = name === 'columns' ? value : formData.columns;
      
      if (rows && columns) {
        const capacity = parseInt(rows) * parseInt(columns);
        setFormData(prev => ({
          ...prev,
          capacity: capacity.toString()
        }));
      }
    }
  };

  // Handle room selection
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    // Extract rows and columns from capacity string like "40 (10 X 4)"
    const capacityMatch = room.capacity.match(/\((\d+)\s*X\s*(\d+)\)/);
    const rows = capacityMatch ? capacityMatch[1] : '10';
    const columns = capacityMatch ? capacityMatch[2] : '4';
    const capacity = capacityMatch ? (parseInt(rows) * parseInt(columns)).toString() : '40';
    
    setFormData({
      session: room.session,
      roomNo: room.roomNo,
      roomType: room.roomType,
      noOfBranches: '4',
      rows: rows,
      columns: columns,
      capacity: capacity
    });
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.roomNo) {
      alert('Please enter room number');
      return;
    }
    if (!formData.rows) {
      alert('Please enter no of rows');
      return;
    }
    if (!formData.columns) {
      alert('Please enter no of columns');
      return;
    }
    if (!formData.capacity) {
      alert('Please enter capacity');
      return;
    }
    if (!formData.noOfBranches) {
      alert('Please enter No.of Branches');
      return;
    }

    // Check for duplicate room number
    const existingRoom = roomList.find(room => 
      room.roomNo === formData.roomNo && room.session === formData.session
    );

    if (existingRoom && !selectedRoom) {
      alert('This room number already exists');
      return;
    }

    setSaveLoading(true);

    try {
      // Get course and examMy from localStorage
      const appData = getAppData();
      const course = appData?.course || 'B.TECH';
      const examMy = appData?.examMY || '';

      // Calculate priority for new rooms
      const maxPriority = roomList.length > 0 ? Math.max(...roomList.map(r => r.priority)) : 0;
      const priority = selectedRoom ? selectedRoom.priority : maxPriority + 1;

      // Prepare data for API
      const roomData = {
        roomNo: formData.roomNo.toUpperCase(),
        noOfColumns: parseInt(formData.columns),
        noOfRows: parseInt(formData.rows),
        priority: priority,
        capacity: parseInt(formData.capacity),
        sem: 0, // Default value
        totalBranches: parseInt(formData.noOfBranches),
        daySession: formData.session,
        roomType: formData.roomType,
        course: course,
        examMy: examMy
      };

      const response = await saveRoom(roomData);

      if (response.success) {
        const message = selectedRoom ? 'Room updated successfully!' : 'Room saved successfully!';
        alert(message);
        console.log('Room saved:', response);

        // Reset form
        handleCancel();

        // Refresh room list
        fetchRoomList();
      } else {
        alert('Failed to save room: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Error saving room: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      session: '1',
      roomNo: '',
      roomType: 'General',
      noOfBranches: '',
      rows: '',
      columns: '',
      capacity: ''
    });
    setSelectedRoom(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRoom) {
      alert('Please select a room to delete');
      return;
    }

    if (!window.confirm('Are you sure to delete?')) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await deleteRoom(selectedRoom.roomNo);

      if (response.success) {
        alert('Room deleted successfully!');
        console.log('Room deleted:', response);

        // Reset form and selection
        handleCancel();

        // Refresh room list
        fetchRoomList();
      } else {
        alert('Failed to delete room: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Error deleting room: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Generate room view grid
  const generateRoomView = () => {
    const rows = parseInt(formData.rows) || 0;
    const columns = parseInt(formData.columns) || 0;
    const grid = [];

    if (rows === 0 || columns === 0) {
      return <tr><td colSpan={1} className={styles.noData}>Enter rows and columns to view room layout</td></tr>;
    }

    for (let i = 1; i <= rows; i++) {
      const row = [];
      for (let j = 1; j <= columns; j++) {
        const seatNumber = i + (j - 1) * rows;
        row.push(
          <td 
            key={`${i}-${j}`} 
            className={`${styles.seat} ${j % 2 === 1 ? styles.seatBlue : styles.seatGreen}`}
          >
            {seatNumber}
          </td>
        );
      }
      grid.push(<tr key={i}>{row}</tr>);
    }

    return grid;
  };

  return (
    <div className={styles.container} style={{ '--theme-color': themeColor }}>
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <h2>
            <FaUser className={styles.headerIcon} />
            Room Master
          </h2>
          <div className={styles.headerButtons}>
            <button className={styles.headerBtn} title="Settings">
              <FaCog />
            </button>
            <button className={styles.headerBtn} title="Minimize">
              <FaChevronUp />
            </button>
            <button className={styles.headerBtn} title="Close">
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className={styles.boxContent}>
          <div className={styles.contentRow}>
            {/* Left Section - Form and Room View */}
            <div className={styles.leftSection}>
              <div className={styles.formSection}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Session</label>
                    <select
                      name="session"
                      value={formData.session}
                      onChange={handleInputChange}
                      className={styles.dropdown}
                    >
                      {sessionOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>No.Of Branches</label>
                    <input
                      type="text"
                      name="noOfBranches"
                      value={formData.noOfBranches}
                      onChange={handleInputChange}
                      className={styles.input}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Room No.</label>
                    <input
                      type="text"
                      name="roomNo"
                      value={formData.roomNo}
                      onChange={handleInputChange}
                      className={styles.input}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Capacity(Rows x Columns)</label>
                    <div className={styles.capacityInputs}>
                      <input
                        type="text"
                        name="rows"
                        value={formData.rows}
                        onChange={handleInputChange}
                        className={styles.input}
                        style={{ width: '41px' }}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span className={styles.capacityX}>X</span>
                      <input
                        type="text"
                        name="columns"
                        value={formData.columns}
                        onChange={handleInputChange}
                        className={styles.input}
                        style={{ width: '40px' }}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Room Type</label>
                    <select
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleInputChange}
                      className={styles.dropdown}
                    >
                      {roomTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  <button 
                    onClick={handleSave} 
                    className={styles.saveBtn}
                    disabled={saveLoading}
                  >
                    {saveLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancel} className={styles.cancelBtn}>Cancel</button>
                  <button 
                    onClick={handleDelete} 
                    className={styles.deleteBtn}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              <div className={styles.roomViewSection}>
                <h3 className={styles.roomViewTitle}>Room View</h3>
                <div className={styles.roomViewContainer}>
                  <table className={styles.roomViewGrid}>
                    <tbody>
                      {generateRoomView()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Section - Room List */}
            <div className={styles.rightSection}>
              <div className={styles.roomListHeader}>
                <div className={styles.headerCell}>PRIORITY</div>
                <div className={styles.headerCell}>ROOM NO</div>
                <div className={styles.headerCell}>CAPACITY(Rows x Columns)</div>
                <div className={styles.headerCell}>Session</div>
                <div className={styles.headerCell}>RoomType</div>
              </div>
              <div className={styles.roomListContainer}>
                {roomListLoading ? (
                  <div className={styles.loadingMessage}>Loading...</div>
                ) : roomList.length === 0 ? (
                  <div className={styles.loadingMessage}>No rooms available for this session.</div>
                ) : (
                  roomList.map((room) => (
                    <div 
                      key={room.id} 
                      className={`${styles.roomListItem} ${selectedRoom?.id === room.id ? styles.selected : ''}`}
                      onClick={() => handleRoomSelect(room)}
                    >
                      <div className={styles.roomData}>
                        <div className={styles.roomCell}>{room.priority}</div>
                        <div className={styles.roomCell}>{room.roomNo}</div>
                        <div className={styles.roomCell}>{room.capacity}</div>
                        <div className={styles.roomCell}>{room.session}</div>
                        <div className={styles.roomCell}>{room.roomType}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomMaster; 