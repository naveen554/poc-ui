import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { FilesPage } from './pages/FilesPage';
import { ContractDetailsPage } from './pages/ContractDetailsPage';
import { DataHarnessPage } from './pages/DataHarnessPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  return (
    <HashRouter>
      <div className="flex min-h-full w-full flex-col bg-canvas">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/pg-management" replace />} />
            <Route path="/pg-management" element={<FilesPage />} />
            <Route path="/pg-management/:fileId" element={<ContractDetailsPage />} />
            <Route path="/data-harness" element={<DataHarnessPage />} />
            <Route path="/insights" element={<ReportsPage />} />
            <Route path="/contracts" element={<Navigate to="/pg-management" replace />} />
            <Route path="/contracts/:fileId" element={<Navigate to="/pg-management" replace />} />
            <Route path="/files" element={<Navigate to="/pg-management" replace />} />
            <Route path="/files/:fileId" element={<Navigate to="/pg-management" replace />} />
            <Route path="/reports" element={<Navigate to="/insights" replace />} />
            <Route path="*" element={<Navigate to="/pg-management" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>);

}