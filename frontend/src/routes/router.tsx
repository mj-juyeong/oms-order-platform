import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell, ProtectedRoute } from '../components/layout';
import { AuditPage } from '../pages/AuditPage';
import { BatchDetailPage } from '../pages/BatchDetailPage';
import { BatchesPage } from '../pages/BatchesPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LabelDownloadsPage } from '../pages/LabelDownloadsPage';
import { LabelLinesPage } from '../pages/LabelLinesPage';
import { LoginPage } from '../pages/LoginPage';
import { OrdersPage } from '../pages/OrdersPage';
import { PlLinesPage } from '../pages/PlLinesPage';
import { ProductMasterPage } from '../pages/ProductMasterPage';
import { ScanLinesPage } from '../pages/ScanLinesPage';
import { StoreRouteMasterPage } from '../pages/StoreRouteMasterPage';
import { UploadsPage } from '../pages/UploadsPage';
import { ValidationResultsPage } from '../pages/ValidationResultsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate replace to="/dashboard" />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/uploads', element: <UploadsPage /> },
          { path: '/batches', element: <BatchesPage /> },
          { path: '/batches/:batchId', element: <BatchDetailPage /> },
          { path: '/batches/:batchId/validation', element: <ValidationResultsPage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/scan-lines', element: <ScanLinesPage /> },
          { path: '/pl-lines', element: <PlLinesPage /> },
          { path: '/label-lines', element: <LabelLinesPage /> },
          { path: '/downloads/labels', element: <LabelDownloadsPage /> },
          { path: '/masters/products', element: <ProductMasterPage /> },
          { path: '/masters/store-routes', element: <StoreRouteMasterPage /> },
          { path: '/audit', element: <AuditPage /> },
        ],
      },
    ],
  },
]);
