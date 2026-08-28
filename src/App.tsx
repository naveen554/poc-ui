import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { FilesPage } from './pages/FilesPage';
import { ContractDetailsPage } from './pages/ContractDetailsPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  return (
    <HashRouter>
      <div className="flex min-h-full w-full flex-col bg-canvas">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/contracts" replace />} />
            <Route path="/contracts" element={<FilesPage />} />
            <Route path="/contracts/:fileId" element={<ContractDetailsPage />} />
            <Route path="/files" element={<Navigate to="/contracts" replace />} />
            <Route path="/files/:fileId" element={<Navigate to="/contracts" replace />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/contracts" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>);

}