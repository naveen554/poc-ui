import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { FilesPage } from './pages/FilesPage';
import { FileDetailsPage } from './pages/FileDetailsPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-full w-full flex-col bg-canvas">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/files" replace />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/files/:fileId" element={<FileDetailsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/files" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>);

}