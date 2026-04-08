import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="app-layout">
      {/* Orb Background */}
      <div className="orb-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <Sidebar />
      <main className="main-content">
        <Header />
        <div style={{ padding: '24px 32px', flex: 1, position: 'relative', zIndex: 10 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
