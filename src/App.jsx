import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import DashboardEditor from './pages/DashboardEditor';

import TemplateGallery from './pages/TemplateGallery';
import DatasetGallery from './pages/DatasetGallery';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardEditor />} />
          <Route path="/templates" element={<TemplateGallery />} />
          <Route path="/datasets" element={<DatasetGallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
