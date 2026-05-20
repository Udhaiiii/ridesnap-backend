import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import LoginPage from '@/features/auth/login/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import PhotographerPage from '@/features/photographer/PhotographerPage';
import PhotoDeskPage from '@/features/photo-desk/PhotoDeskPage';
import PrintDashboardPage from '@/features/print-queue/PrintDashboardPage';
import AdminDashboardPage from '@/features/admin/AdminDashboardPage';
import BulkQrPrinterPage from '@/features/bulk-qr/BulkQrPrinterPage';
import FinancialReportPage from '@/features/reports/FinancialReportPage';
import ReceiptPage from '@/features/receipt/ReceiptPage';

export function AppRoutes() {
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
