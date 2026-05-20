import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PhotographerPage from '@/pages/PhotographerPage';
import PhotoDeskPage from '@/pages/PhotoDeskPage';
import PrintDashboardPage from '@/pages/PrintDashboardPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import BulkQrPrinterPage from '@/pages/BulkQrPrinterPage';
import FinancialReportPage from '@/pages/FinancialReportPage';
import ReceiptPage from '@/pages/ReceiptPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photographer"
        element={
          <ProtectedRoute roles={['photographer', 'admin']}>
            <PhotographerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photo-desk"
        element={
          <ProtectedRoute roles={['counter', 'admin']}>
            <PhotoDeskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/print"
        element={
          <ProtectedRoute roles={['print', 'admin']}>
            <PrintDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-qr"
        element={
          <ProtectedRoute roles={['admin']}>
            <BulkQrPrinterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={['admin']}>
            <FinancialReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="/receipt/:orderId" element={<ReceiptPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
