import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, themes } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext';

// Complete menu data structure
export const menuData = [
  { text: "Dashboard", icon: "fa-dashboard", url: "/dashboard", hasSubmenu: false },
  {
    text: "Source / Masters", icon: "fa-database", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Programme & Branches", url: "/source/programme-branches" },
      { text: "Courses", url: "/source/courses" },
      { text: "Student Data", url: "/source/student-data" },
      { text: "Employee Data", url: "/source/employee-data" },
      { text: "Exam Notifications", url: "/source/exam-notifications" },
      { text: "Fee Structure", url: "/source/fee-structure" },
      { text: "Master Creation", url: "/source/master-creation" },
      { text: "Course Grades", url: "/source/course-grades" },
      { text: "Semester Grades", url: "/source/semester-grades" },
      { text: "Room Master", url: "/source/room-master" },
      { text: "Import Data", url: "/source/import-data" },
      { text: "Fee Heads", url: "/source/fee-heads" },
      { text: "Class Grade", url: "/source/class-grade" },
      { text: "Studentwise Master Creation", url: "/source/studentwise-master" },
      { text: "Branch Priority", url: "/source/branch-priority" },
    ]
  },
  {
    text: "Source Reports", icon: "fa-file-text", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Courses List", url: "/source-reports/courses-list" },
      { text: "Course Grades List", url: "/source-reports/course-grades-list" },
      { text: "Semester Grades List", url: "/source-reports/semester-grades-list" },
      { text: "Room Master", url: "/source-reports/room-master" },
    ]
  },
  {
    text: "Pre-Exams", icon: "fa-calendar", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Exam Registrations", url: "/pre-exams/exam-registrations" },
      { text: "Time Table and Seating", url: "/pre-exams/time-table-seating" },
      { text: "RV/RC/RVC Registration", url: "/pre-exams/rv-rc-rvc-registration" },
      { text: "Student Screen", url: "/pre-exams/student-screen" },
      { text: "Miscellaneous Fee Pay", url: "/pre-exams/miscellaneous-fee-pay" },
      { text: "DupCertificate Issue", url: "/pre-exams/dup-certificate-issue" },
      { text: "ExamFee Concession", url: "/pre-exams/exam-fee-concession" },
      { text: "Room Allotment (Room Wise)", url: "/pre-exams/room-allotment" },
      { text: "Condonation Fee", url: "/pre-exams/condonation-fee" },
      { text: "ReceiptList", url: "/pre-exams/receipt-list" },
      { text: "Cancel Receipt", url: "/pre-exams/cancel-receipt" },
      { text: "Consolidated Fee Report", url: "/pre-exams/consolidated-fee-report" },
      { text: "SupplyLabRegisteredData", url: "/pre-exams/supply-lab-registered-data" },
      { text: "Credits Mismatch", url: "/pre-exams/credits-mismatch" },
      { text: "Exam_UnRegistration", url: "/pre-exams/exam-unregistration" },
      { text: "Unblock_Registrations", url: "/pre-exams/unblock-registrations" },
    ]
  },
  {
    text: "Pre Exam Reports", icon: "fa-clock-o", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Time Table", url: "/pre-exam-reports/time-table" },
      { text: "HallTickets", url: "/pre-exam-reports/hall-tickets" },
      { text: "Question Paper Statement", url: "/pre-exam-reports/question-paper-statement" },
      { text: "OMR Sheet", url: "/pre-exam-reports/omr-sheet" },
      { text: "Nominal Rolls", url: "/pre-exam-reports/nominal-rolls" },
      { text: "Exam Fee Collection", url: "/pre-exam-reports/exam-fee-collection" },
      { text: "Cancel Receipt List", url: "/pre-exam-reports/cancel-receipt-list" },
      { text: "Consolidated Fee Report", url: "/pre-exam-reports/consolidated-fee-report" },
      { text: "Room Abstruct", url: "/pre-exam-reports/room-abstruct" },
      { text: "Mid HallTickets", url: "/pre-exam-reports/mid-hall-tickets" },
      { text: "Seating Arrangement", url: "/pre-exam-reports/seating-arrangement" },
      { text: "RoomWise NominalRolls", url: "/pre-exam-reports/roomwise-nominal-rolls" },
    ]
  },
  {
    text: "Post-Exams", icon: "fa-clipboard", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Internal Marks Entry", url: "/post-exams/internal-marks-entry" },
      { text: "PracticalMarksEntry", url: "/post-exams/practical-marks-entry" },
      { text: "Absentees Entry", url: "/post-exams/absentees-entry" },
      { text: "Reg. No. Wise Marks Entry", url: "/post-exams/reg-no-wise-marks-entry" },
      { text: "Marks Entry (OMR)", url: "/post-exams/marks-entry-omr" },
      { text: "Exammy Update", url: "/post-exams/exammy-update" },
      { text: "Regno_Exammywise_Subjects", url: "/post-exams/regno-exammywise-subjects" },
      { text: "Mid AbsenteesEntry", url: "/post-exams/mid-absentees-entry" },
    ]
  },
  {
    text: "Post Exam Reports", icon: "fa-bar-chart", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Internal Check List", url: "/post-exam-reports/internal-check-list" },
      { text: "Practical Check List", url: "/post-exam-reports/practical-check-list" },
      { text: "D Form", url: "/post-exam-reports/d-form" },
      { text: "Absentees List", url: "/post-exam-reports/absentees-list" },
      { text: "Subject Wise PresentList", url: "/post-exam-reports/subject-wise-present-list" },
      { text: "D Form Mid", url: "/post-exam-reports/d-form-mid" },
    ]
  },
  {
    text: "Results", icon: "fa-trophy", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Pending List", url: "/results/pending-list" },
      { text: "Moderation/Result/Flotation", url: "/results/moderation-result" },
      { text: "Student History", url: "/results/student-history" },
      { text: "ReAdmission", url: "/results/readmission" },
      { text: "BackLogs List", url: "/results/backlogs-list" },
      { text: "Toppers List", url: "/results/toppers-list" },
      { text: "Student Result", url: "/results/student-result" },
      { text: "Subjectwise FailedList", url: "/results/subjectwise-failed" },
      { text: "RV Closing Date(s)", url: "/results/rv-closing-dates" },
      { text: "NBA - (SGPA and CGPA)", url: "/results/nba-sgpa-cgpa" },
      { text: "Marks Data Internal & External", url: "/results/marks-data" },
      { text: "CreditSecured_Excel", url: "/results/credit-secured" },
      { text: "Backlogs (Regno Wise)", url: "/results/backlogs-regno-wise" },
      { text: "OMR Number Update", url: "/results/omr-number-update" },
      { text: "Result Sheet (Excel Export)", url: "/results/result-sheet-excel-export" },
      { text: "Student History(Without Marks)", url: "/results/student-history-without-marks" },
      { text: "Result Process (Regno Wise)", url: "/results/result-process-regno" },
      { text: "Grofting Process", url: "/results/grofting-process" },
      { text: "Total Secured Credits", url: "/results/total-secured-credits" },
      { text: "OD DATA", url: "/results/od-data" },
      { text: "OD Subject data", url: "/results/od-subject-data" },
      { text: "University Data", url: "/results/university-data" },
      { text: "Training & Placement Data", url: "/results/training-placement-data" },
      { text: "Grace Data", url: "/results/grace-data" },
      { text: "RV2 Marks Entry", url: "/results/rv2-marks-entry" },
      { text: "CGPA_YearWise", url: "/results/cgpa-yearwise" },
    ]
  },
  {
    text: "Result Reports", icon: "fa-line-chart", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Pre Moderation", url: "/result-reports/pre-moderation" },
      { text: "Course Percentage", url: "/result-reports/course-percentage" },
      { text: "Branch wise Course Percent", url: "/result-reports/branch-wise-course-percent" },
      { text: "Branch wise Percent", url: "/result-reports/branch-wise-percent" },
      { text: "Passed Result", url: "/result-reports/passed-result" },
      { text: "Failed in Sem Result Passed in Subjects", url: "/result-reports/failed-in-sem-result-passed" },
      { text: "Grade Card", url: "/result-reports/grade-card" },
      { text: "M.Tech CMM", url: "/result-reports/mtech-cmm" },
      { text: "PC (ALL COURSES)", url: "/result-reports/pc-all-courses" },
      { text: "MBA CMM", url: "/result-reports/mba-cmm" },
      { text: "CGC (All Programmes)", url: "/result-reports/cgc-all-programmes" },
      { text: "Result Check List", url: "/result-reports/result-check-list" },
      { text: "Result Sheet - V1 (Marks)", url: "/result-reports/result-sheet-v1-marks" },
      { text: "Result Sheet - V1 & RV (Grades)", url: "/result-reports/result-sheet-v1-rv-grades" },
      { text: "Tabulation Register", url: "/result-reports/tabulation-register" },
      { text: "RV Reports (Check Lists & Result Sheet)", url: "/result-reports/rv-reports-check-lists" },
      { text: "SGPA & CGPA - H.T.No. wise", url: "/result-reports/sgpa-cgpa-ht-no-wise" },
      { text: "Credits Secured - H.T.No. wise", url: "/result-reports/credits-secured-ht-no-wise" },
      { text: "AwardofClass Branchwise", url: "/result-reports/awardofclass-branchwise" },
      { text: "Exam Fee Collection", url: "/result-reports/exam-fee-collection" },
      { text: "NBA - (Award Degree List)", url: "/result-reports/nba-award-degree-list" },
      { text: "Branch wise Course Section Percent", url: "/result-reports/branch-wise-course-section-percent" },
      { text: "Branch wise Section Percent", url: "/result-reports/branch-wise-section-percent" },
      { text: "Subject wise failed list", url: "/result-reports/subject-wise-failed-list" },
      { text: "Subject Wise Grades Count", url: "/result-reports/subject-wise-grades-count" },
      { text: "Transcript", url: "/result-reports/transcript" },
      { text: "Result Sheet - Subject Moderation", url: "/result-reports/result-sheet-subject-moderation" },
      { text: "Result Sheet - Grafting", url: "/result-reports/result-sheet-grafting" },
      { text: "Web Result", url: "/result-reports/web-result" },
      { text: "Individual_MarksMemo", url: "/result-reports/individual-marks-memo" },
      { text: "TC_Issue", url: "/result-reports/tc-issue" },
      { text: "SC_Issue", url: "/result-reports/sc-issue" },
      { text: "PC", url: "/result-reports/pc" },
      { text: "JNTUH University PC Data", url: "/result-reports/jntuh-university-pc-data" },
      { text: "RV Summery Report", url: "/result-reports/rv-summery-report" },
      { text: "University Subject Data", url: "/result-reports/university-subject-data" },
      { text: "University_CD_Data", url: "/result-reports/university-cd-data" },
      { text: "Audit Course", url: "/result-reports/audit-course" },
    ]
  },
  {
    text: "Settings", icon: "fa-cog", url: "#", hasSubmenu: true,
    submenu: [
      { text: "User Form(s)", url: "/settings/user-forms" },
      { text: "BackUp Database", url: "/settings/backup-database" },
      { text: "BioMetricEntry", url: "/settings/biometric-entry" },
      { text: "Export to Stdportal", url: "/settings/export-to-stdportal" },
      { text: "ExportToStdportal_RegnoWise", url: "/settings/export-to-stdportal-regno-wise" },
    ]
  },
  {
    text: "Evaluation", icon: "fa-graduation-cap", url: "#", hasSubmenu: true,
    submenu: [
      { text: "Schema Structure", url: "/evaluation/schema-structure" },
      { text: "Apply Schema", url: "/evaluation/apply-schema" },
      { text: "Evaluator Registration", url: "/evaluation/evaluator-registration" },
      { text: "Scripts Assign", url: "/evaluation/scripts-assign" },
    ]
  },
];

const SubMenuPortal = ({ menu, position, onMouseEnter, onMouseLeave, onClose, activeSubmenu, onSubmenuClick, themeColor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef(null);
  const isMobile = position.isMobile;
  // Use 2 columns for large menus, 1 for small
  const cols = menu.submenu.length > 15 ? 2 : 1;
  const panelWidth = isMobile ? 'calc(100vw - 32px)' : (cols === 2 ? 560 : 300);
  // Center the panel vertically in the viewport
  const vh = window.innerHeight;
  const maxPanelH = Math.min(520, vh - 48);
  const finalTop = isMobile ? 16 : Math.max(24, Math.round((vh - maxPanelH) / 2));

  const filteredSubmenu = menu.submenu.filter(item =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prevent background page from scrolling when scrolling inside the submenu box
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop === 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
      e.stopPropagation();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: `${finalTop}px`,
        left: `${position.left}px`,
        width: typeof panelWidth === 'string' ? panelWidth : `${panelWidth}px`,
        height: `${maxPanelH}px`,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
        zIndex: 99999,
        animation: 'sbSlideIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: `linear-gradient(135deg, ${themeColor}18, ${themeColor}08)`,
        borderBottom: `1px solid ${themeColor}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', borderRadius: '6px',
            background: `${themeColor}15`, color: themeColor,
            boxShadow: `0 0 10px ${themeColor}33`,
          }}>
            <i className="fa fa-layer-group" style={{ fontSize: '12px' }} />
          </div>
          <span style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px',
            color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px',
          }}>{menu.text}</span>
          <span style={{
            background: `${themeColor}18`, color: themeColor, borderRadius: '20px',
            padding: '2px 9px', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
            border: `1px solid ${themeColor}33`,
          }}>{menu.submenu.length}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px',
            fontSize: '14px', lineHeight: 1, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        >✕</button>
      </div>

      {/* Search Box */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${themeColor}15`, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', background: '#ffffff',
          borderRadius: '8px', padding: '8px 12px', border: `1.5px solid ${themeColor}66`,
          boxShadow: `0 0 0 3px ${themeColor}15`, transition: 'all 0.2s ease'
        }}>
          <i className="fa fa-search" style={{ color: themeColor, fontSize: '13px', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              width: '100%', fontSize: '13px', fontFamily: 'Inter, sans-serif',
              color: '#1e293b', caretColor: themeColor
            }}
            onFocus={(e) => {
              e.target.parentElement.style.borderColor = themeColor;
              e.target.parentElement.style.boxShadow = `0 0 0 3px ${themeColor}33`;
            }}
            onBlur={(e) => {
              e.target.parentElement.style.borderColor = `${themeColor}66`;
              e.target.parentElement.style.boxShadow = `0 0 0 3px ${themeColor}15`;
            }}
          />
        </div>
      </div>

      {/* Items — scrollable */}
      <div
        ref={scrollRef}
        style={{
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${cols}, 1fr)`,
        gap: '2px',
        alignContent: 'start',
        scrollbarWidth: 'thin',
        scrollbarColor: `${themeColor}55 transparent`,
      }}>
        {filteredSubmenu.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontFamily: 'Inter, sans-serif', gridColumn: `1 / -1` }}>
            No options found
          </div>
        ) : filteredSubmenu.map((item, idx) => {
          const isActive = activeSubmenu === item.text;
          return (
            <div
              key={idx}
              onClick={() => onSubmenuClick(item)}
              style={{
                padding: '8px 11px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '9px',
                background: isActive ? `${themeColor}15` : 'transparent',
                border: isActive ? `1px solid ${themeColor}33` : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = `${themeColor}0d`;
                  e.currentTarget.style.borderColor = `${themeColor}22`;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <i className="fa fa-angle-right" style={{
                fontSize: '12px', flexShrink: 0, marginTop: '2px',
                color: isActive ? themeColor : `${themeColor}88`,
                textShadow: isActive ? `0 0 8px ${themeColor}66` : 'none',
                transition: 'all 0.2s ease',
                transform: isActive ? 'translateX(2px)' : 'translateX(0)',
              }} />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? themeColor : '#475569',
                lineHeight: 1.45,
                transition: 'color 0.15s',
                wordBreak: 'break-word',
              }}>{item.text}</span>
              {isActive && (
                <div style={{
                  marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%',
                  background: `${themeColor}18`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="fa fa-check" style={{ fontSize: '9px', color: themeColor }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: '#fafafa',
      }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#94a3b8' }}>
          {filteredSubmenu.length} of {menu.submenu.length} options
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#cbd5e1' }}>&#8597; scroll</span>
      </div>
    </div>,
    document.body
  );
};

const ThemePortal = ({ position, onMouseEnter, onMouseLeave, onClose, currentTheme, onThemeChange }) => {
  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '280px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
        zIndex: 99999,
        animation: 'sbSlideIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Choose Theme
        </span>
        <button
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        >✕</button>
      </div>
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {themes.map(theme => {
          const isActive = currentTheme === theme.value;
          return (
            <div
              key={theme.value}
              onClick={() => onThemeChange(theme.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '10px 6px', borderRadius: '12px', cursor: 'pointer',
                background: isActive ? `${theme.color}10` : 'transparent',
                border: isActive ? `1px solid ${theme.color}44` : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: theme.color,
                boxShadow: isActive ? `0 0 14px ${theme.color}66` : `0 3px 10px ${theme.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
              }}>
                {isActive && <i className="fa fa-check" style={{ color: '#fff', fontSize: '12px' }} />}
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: isActive ? '#1e293b' : '#94a3b8', fontWeight: isActive ? 700 : 400 }}>
                {theme.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

const Sidebar = ({ isVisible = true, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, changeTheme, getCurrentThemeColor } = useTheme();
  const { user, logout } = useAuth();
  const themeColor = getCurrentThemeColor();

  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [pinnedMenu, setPinnedMenu] = useState(null);
  const [pinnedMenuPosition, setPinnedMenuPosition] = useState({ top: 0, left: 0 });
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [activeSubmenu, setActiveSubmenu] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 80, left: 308 });
  const [themeMenuPosition, setThemeMenuPosition] = useState({ top: 0, left: 0 });

  const timeoutRef = useRef(null);
  const themeTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuItemRefs = useRef({});
  const themeMenuRef = useRef(null);
  const profileRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      setActiveMenu('Dashboard'); setActiveSubmenu('');
    } else {
      for (const menu of menuData) {
        if (menu.hasSubmenu && menu.submenu) {
          for (const sub of menu.submenu) {
            if (path === sub.url) { setActiveMenu(menu.text); setActiveSubmenu(sub.text); return; }
          }
        } else if (menu.url === path) { setActiveMenu(menu.text); setActiveSubmenu(''); return; }
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isVisible) { setHoveredMenu(null); clearTimeout(timeoutRef.current); }
  }, [isVisible]);

  const calcPosition = (ref) => {
    if (!ref || !sidebarRef.current) return { top: 80, left: 308 };
    const sRect = sidebarRef.current.getBoundingClientRect();
    const iRect = ref.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Mobile View: Popover covers most of the screen
    if (vw <= 768) {
      return { top: 16, left: 16, isMobile: true };
    }

    let top = iRect.top;
    if (top + 400 > vh) top = Math.max(10, vh - 420);
    return { top, left: sRect.right + 8 };
  };

  const handleMenuHover = (menu, index) => {
    clearTimeout(timeoutRef.current);
    setShowThemeSelector(false);
    if (menu.hasSubmenu) {
      setHoveredMenu(index);
      setSubmenuPosition(calcPosition(menuItemRefs.current[index]));
    } else {
      setHoveredMenu(null);
    }
  };

  const handleMenuLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // If there's a pinned menu, just clear the temporary hover — pinned one will show again
      setHoveredMenu(null);
    }, 200);
  };

  const handleSubmenuClick = (item) => {
    setActiveSubmenu(item.text);
    setHoveredMenu(null);
    setPinnedMenu(null);
    navigate(item.url);
  };

  const handleMenuClick = (menu, index) => {
    setActiveMenu(menu.text);
    if (!menu.hasSubmenu) {
      setHoveredMenu(null);
      setPinnedMenu(null);
      setActiveSubmenu('');
      navigate(menu.url);
    } else {
      if (pinnedMenu === index) {
        setPinnedMenu(null);
      } else {
        setPinnedMenu(index);
        setPinnedMenuPosition(calcPosition(menuItemRefs.current[index]));
      }
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        @keyframes sbSlideIn {
          from { opacity: 0; transform: translateX(-12px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .sb-menu-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 11px 18px;
          margin: 2px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.2, 0.64, 1);
          border: 1px solid transparent;
          text-decoration: none;
          overflow: hidden;
        }
        .sb-menu-item::before {
          content: '';
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 0;
          background: var(--theme-color);
          border-radius: 0 3px 3px 0;
          transition: height 0.25s ease;
        }
        .sb-menu-item:hover { 
          background: var(--theme-color-light) !important; 
          border-color: var(--theme-color-medium) !important;
          transform: translateX(4px);
        }
        .sb-menu-item:hover::before { height: 60%; }
        .sb-menu-item:hover .sb-icon {
          transform: scale(1.15);
          color: var(--theme-color) !important;
        }
        .sb-menu-item:hover .sb-label { color: var(--theme-color) !important; }
        .sb-menu-item.active {
          background: var(--theme-color-light) !important;
          border-color: var(--theme-color-medium) !important;
        }
        .sb-menu-item.active::before { height: 60%; }
        .sb-menu-item.active .sb-icon { color: var(--theme-color) !important; }
        .sb-menu-item.active .sb-label { color: var(--theme-color) !important; font-weight: 600; }
        .sb-icon {
          font-size: 15px;
          color: var(--theme-color);
          min-width: 20px;
          text-align: center;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sb-label {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.2s;
        }
        .sb-arrow {
          font-size: 10px;
          color: #cbd5e1;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }
        .sb-menu-item:hover .sb-arrow,
        .sb-menu-item.active .sb-arrow { color: var(--theme-color); }
        .sb-section-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #b0bec5;
          padding: 16px 22px 6px;
          margin-top: 4px;
        }
      `}</style>

      <div
        id="app-sidebar"
        ref={sidebarRef}
        style={{
          position: 'fixed',
          left: 0, top: 0,
          height: '100vh',
          width: '320px',
          zIndex: 1000,
          background: '#ffffff',
          borderRight: '1px solid #e8edf3',
          boxShadow: '4px 0 24px rgba(0,0,0,0.07)',
          transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Brand Header with Logo + Toggle */}
        <div style={{
          padding: '0 16px',
          height: '64px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '11px',
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${themeColor}44`,
              flexShrink: 0,
            }}>
              <i className="fa fa-graduation-cap" style={{ color: '#fff', fontSize: '16px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: '#1e293b', letterSpacing: '0.3px', lineHeight: 1.1 }}>
                iCAMPUS
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10.5px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                Exam Management
              </div>
            </div>
          </div>

          {/* Collapse Arrow */}
          <button
            onClick={() => onToggleSidebar && onToggleSidebar()}
            title="Collapse sidebar"
            style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${themeColor}15`;
              e.currentTarget.style.borderColor = `${themeColor}44`;
              e.currentTarget.style.color = themeColor;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <i className="fa fa-chevron-left" />
          </button>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '20px' }}>
          <div className="sb-section-label">Navigation</div>

          {menuData.map((menu, index) => {
            const isActive = activeMenu === menu.text;
            const isHovered = hoveredMenu === index;
            const isEvaluation = menu.text === 'Evaluation';

            return (
              <React.Fragment key={index}>
                <div
                  ref={el => menuItemRefs.current[index] = el}
                  className={`sb-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleMenuClick(menu, index)}
                  onMouseEnter={() => handleMenuHover(menu, index)}
                  onMouseLeave={handleMenuLeave}
                  style={{
                    background: isHovered && !isActive ? 'var(--theme-color-light)' : undefined,
                    borderColor: isHovered && !isActive ? 'var(--theme-color-medium)' : undefined,
                  }}
                >
                  <i className={`fa ${menu.icon} sb-icon`} />
                  <span className="sb-label">{menu.text}</span>
                  {menu.hasSubmenu && (
                    <i className={`fa fa-chevron-right sb-arrow`} style={{
                      transform: isHovered ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.25s ease',
                    }} />
                  )}
                </div>

                {isEvaluation && (
                  <>
                    <div className="sb-section-label" style={{ marginTop: '8px' }}>Appearance</div>
                    <div
                      ref={themeMenuRef}
                      className="sb-menu-item"
                      style={{ background: showThemeSelector ? 'var(--theme-color-light)' : undefined, borderColor: showThemeSelector ? 'var(--theme-color-medium)' : undefined }}
                      onMouseEnter={() => {
                        clearTimeout(themeTimeoutRef.current);
                        setHoveredMenu(null);
                        setShowThemeSelector(true);
                        setThemeMenuPosition(calcPosition(themeMenuRef.current));
                      }}
                      onMouseLeave={() => {
                        themeTimeoutRef.current = setTimeout(() => setShowThemeSelector(false), 250);
                      }}
                    >
                      <i className="fa fa-paint-brush sb-icon" style={{ color: showThemeSelector ? themeColor : '#94a3b8' }} />
                      <span className="sb-label" style={{ color: showThemeSelector ? themeColor : undefined }}>Change Theme</span>
                      <i className="fa fa-chevron-right sb-arrow" style={{
                        transform: showThemeSelector ? 'rotate(90deg)' : 'rotate(0)',
                        transition: 'transform 0.25s ease',
                      }} />
                    </div>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Profile Section ─────────────────────── */}
        <div
          ref={profileRef}
          style={{ flexShrink: 0, borderTop: '1px solid #f1f5f9', padding: '10px 12px', position: 'relative' }}
        >
          {/* Profile button */}
          <div
            onClick={() => setShowProfileMenu(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: '12px', cursor: 'pointer',
              background: showProfileMenu ? `${themeColor}10` : 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (!showProfileMenu) e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { if (!showProfileMenu) e.currentTarget.style.background = showProfileMenu ? `${themeColor}10` : 'transparent'; }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa fa-user" style={{ color: '#fff', fontSize: '14px' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700,
                color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.username || user?.name || 'User'}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#94a3b8' }}>
                {user?.role || 'Exam Cell'}
              </div>
            </div>
            <i className="fa fa-chevron-up" style={{
              fontSize: '10px', color: '#cbd5e1', flexShrink: 0,
              transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.25s ease',
            }} />
          </div>

          {/* Profile popup — opens upward */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '12px', right: '12px',
              background: '#ffffff',
              borderRadius: '14px',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              animation: 'sbSlideIn 0.2s ease',
              zIndex: 1001,
            }}>
              {/* User header */}
              <div style={{
                padding: '14px 16px',
                background: `linear-gradient(135deg, ${themeColor}12, ${themeColor}06)`,
                borderBottom: `1px solid ${themeColor}18`,
              }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  {user?.username || user?.name || 'User'}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: themeColor, marginTop: '2px', fontWeight: 600 }}>
                  {user?.role || 'Exam Cell'}
                </div>
              </div>
              {[
                { icon: 'fa-ticket', label: 'Raise Ticket' },
                { icon: 'fa-key', label: 'Change Password' },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 16px', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: '13px',
                    fontWeight: 500, color: '#475569', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = themeColor; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                >
                  <i className={`fa ${item.icon}`} style={{ fontSize: '13px', width: '16px', textAlign: 'center' }} />
                  {item.label}
                </div>
              ))}
              <div style={{ height: '1px', background: '#f1f5f9', margin: '0 12px' }} />
              <div
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '11px 16px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  fontWeight: 700, color: '#ef4444', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <i className="fa fa-sign-out" style={{ fontSize: '13px', width: '16px', textAlign: 'center' }} />
                Logout
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Submenu Portal */}
      {(hoveredMenu !== null || pinnedMenu !== null) && menuData[hoveredMenu !== null ? hoveredMenu : pinnedMenu]?.hasSubmenu && (
        <SubMenuPortal
          menu={menuData[hoveredMenu !== null ? hoveredMenu : pinnedMenu]}
          position={hoveredMenu !== null ? submenuPosition : pinnedMenuPosition}
          themeColor={themeColor}
          activeSubmenu={activeSubmenu}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={() => {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              // Only close the box entirely if nothing is pinned
              if (pinnedMenu === null) {
                setHoveredMenu(null);
              } else {
                // Revert to showing pinned menu's box
                setHoveredMenu(null);
              }
            }, 200);
          }}
          onClose={() => { setHoveredMenu(null); setPinnedMenu(null); }}
          onSubmenuClick={handleSubmenuClick}
        />
      )}

      {/* Theme Portal */}
      {showThemeSelector && (
        <ThemePortal
          position={themeMenuPosition}
          currentTheme={currentTheme}
          onThemeChange={(v) => { changeTheme(v); setShowThemeSelector(false); }}
          onMouseEnter={() => clearTimeout(themeTimeoutRef.current)}
          onMouseLeave={() => { themeTimeoutRef.current = setTimeout(() => setShowThemeSelector(false), 250); }}
          onClose={() => setShowThemeSelector(false)}
        />
      )}
    </>
  );
};

export default Sidebar;