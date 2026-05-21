import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { ModuleRoute } from '@/app/ModuleRoute';
import LoginPage from '@/features/auth/login/LoginPage';
import StaffPortalPage from '@/features/portal/StaffPortalPage';

const PhotographerPage = lazy(
  () => import('@/features/photographer/PhotographerPage'),
);
const PhotoDeskPage = lazy(() => import('@/features/photo-desk/PhotoDeskPage'));
const PrintDashboardPage = lazy(
  () => import('@/features/print-queue/PrintDashboardPage'),
);
const AdminDashboardPage = lazy(
  () => import('@/features/admin/AdminDashboardPage'),
);
const BulkQrPrinterPage = lazy(
  () => import('@/features/bulk-qr/BulkQrPrinterPage'),
);
const FinancialReportPage = lazy(
  () => import('@/features/reports/FinancialReportPage'),
);
const ReceiptPage = lazy(() => import('@/features/receipt/ReceiptPage'));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Staff portal (legacy index.html) — shown after login */}
      <Route
        path="/"
        element={
          <ProtectedRoute roles={['admin', 'photographer', 'counter', 'print']}>
            <StaffPortalPage />
          </ProtectedRoute>
        }
      />

      {/* Seven modules — code-split; loaded when user opens a card */}
      <Route
        path="/photographer"
        element={
          <ModuleRoute pageName="Photographer App" roles={['photographer', 'admin']}>
            <PhotographerPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/photo-desk"
        element={
          <ModuleRoute pageName="Photo Desk" roles={['counter', 'admin']}>
            <PhotoDeskPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/print"
        element={
          <ModuleRoute pageName="Print Dashboard" roles={['print', 'admin']}>
            <PrintDashboardPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/bulk-qr"
        element={
          <ModuleRoute pageName="Wristband Printer" roles={['admin']}>
            <BulkQrPrinterPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ModuleRoute pageName="Admin Dashboard" roles={['admin']}>
            <AdminDashboardPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/receipt"
        element={
          <ModuleRoute pageName="Receipt" roles={['admin']}>
            <ReceiptPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ModuleRoute pageName="Financial Report" roles={['admin']}>
            <FinancialReportPage />
          </ModuleRoute>
        }
      />

      {/* Guest / deep link receipt (no staff portal shell) */}
      <Route
        path="/receipt/:orderId"
        element={
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center font-rs-mono text-rs-sub">
                Loading receipt…
              </div>
            }
          >
            <ReceiptPage />
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
