import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell, GuestRoute, ProtectedRoute } from '../components/layout';
import { AuditPage } from '../pages/AuditPage';
import { ApiKeysPage } from '../pages/ApiKeysPage';
import { BatchConfirmationRequestsPage } from '../pages/BatchConfirmationRequestsPage';
import { BatchDetailPage } from '../pages/BatchDetailPage';
import { BatchesPage } from '../pages/BatchesPage';
import { ClientMasterVisibilitySettingsPage } from '../pages/ClientMasterVisibilitySettingsPage';
import { ClientPublicMasterPage } from '../pages/ClientPublicMasterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ExternalApiStatusPage } from '../pages/ExternalApiStatusPage';
import { ExternalApiGuidePage } from '../pages/ExternalApiGuidePage';
import { ClientManagementPage } from '../pages/ClientManagementPage';
import { LabelWorkspacePage } from '../pages/LabelWorkspacePage';
import { LoginPage } from '../pages/LoginPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { OrdersPage } from '../pages/OrdersPage';
import { PlLinesPage } from '../pages/PlLinesPage';
import { ProductMasterPage } from '../pages/ProductMasterPage';
import { ScanLinesPage } from '../pages/ScanLinesPage';
import { StoreRouteMasterPage } from '../pages/StoreRouteMasterPage';
import { TenantManagementPage } from '../pages/TenantManagementPage';
import { UploadsPage } from '../pages/UploadsPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { ValidationResultsPage } from '../pages/ValidationResultsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate replace to="/dashboard" />,
  },
  {
    element: <GuestRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          {
            path: '/notifications',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <NotificationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/uploads',
            element: (
              <ProtectedRoute requiredRoles={['OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <UploadsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/batches',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <BatchesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/batch-confirmation-requests',
            element: (
              <ProtectedRoute requiredRoles={['OPERATOR', 'ADMIN']} requiredScopes={['TENANT']}>
                <BatchConfirmationRequestsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/batches/:batchId',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <BatchDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/batches/:batchId/validation',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <ValidationResultsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/orders',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <OrdersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/scan-lines',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <ScanLinesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/pl-lines',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <PlLinesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/label-lines',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <LabelWorkspacePage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/downloads/labels',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <LabelWorkspacePage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/external-api/guide',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <ExternalApiGuidePage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/external-api/status',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <ExternalApiStatusPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/external-api/api-keys',
            element: (
              <ProtectedRoute requiredRoles={['ADMIN']} requiredScopes={['TENANT']}>
                <ApiKeysPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/masters/products',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT']}>
                <ProductMasterPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/masters/store-routes',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT']}>
                <StoreRouteMasterPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/client-masters',
            element: (
              <ProtectedRoute requiredRoles={['VIEWER', 'OPERATOR', 'ADMIN']} requiredScopes={['TENANT', 'CLIENT']}>
                <ClientPublicMasterPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/masters/client-visibility',
            element: (
              <ProtectedRoute requiredRoles={['ADMIN']} requiredScopes={['TENANT']}>
                <ClientMasterVisibilitySettingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/tenants',
            element: (
              <ProtectedRoute requiredRoles={['SYSTEM_ADMIN']} requiredScopes={['SYSTEM']}>
                <TenantManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/clients',
            element: (
              <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']} requiredScopes={['SYSTEM', 'TENANT']}>
                <ClientManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/users',
            element: (
              <ProtectedRoute requiredRoles={['ADMIN', 'SYSTEM_ADMIN']} requiredScopes={['SYSTEM', 'TENANT']}>
                <UserManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/audit',
            element: (
              <ProtectedRoute requiredRoles={['ADMIN']} requiredScopes={['TENANT']}>
                <AuditPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);
