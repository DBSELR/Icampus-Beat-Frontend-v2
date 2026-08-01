import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Footer from './components/Footer.jsx';

const Layout = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    // Hide page loader after component mounts
    const loader = document.querySelector('.page-loader-wrapper');
    if (loader) {
      loader.style.display = 'none';
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  return (
    <div id="main_content" className="font-muli theme-blush" style={{ backgroundColor: '#f6f8fb', minHeight: '100vh' }}>
      {/* Page Loader - Hidden by default, shown only during initial load */}
      <div className="page-loader-wrapper" style={{ display: 'none' }}>
        <div className="loader"></div>
      </div>
      
      <Header onToggleSidebar={toggleSidebar} sidebarVisible={sidebarVisible} />
      <Sidebar isVisible={sidebarVisible} onToggleSidebar={toggleSidebar} />

      <div
        className="page"
        style={{
          paddingTop: '64px',
          marginLeft: sidebarVisible ? '320px' : '0',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: sidebarVisible ? 'calc(100% - 320px)' : '100%',
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
          left: 0,
          marginRight: 0,
          marginTop: 0,
          marginBottom: 0,
          boxSizing: 'border-box',
          background: '#f6f8fb',
        }}
      >
        <div className="section-body" style={{ margin: 0, padding: 0, width: '100%' }}>
          <div className="container-fluid" style={{
            maxWidth: '100%',
            paddingLeft: '15px',
            paddingRight: '15px',
            paddingTop: '15px',
            paddingBottom: '15px',
            margin: 0,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <Outlet />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Layout; 