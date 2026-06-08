import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ConfirmationListPage from './pages/ConfirmationListPage';
import ConfirmationDetailPage from './pages/ConfirmationDetailPage';
import ConfirmationCreatePage from './pages/ConfirmationCreatePage';
import TodoTaskPage from './pages/TodoTaskPage';
import AuditFirmDashboard from './pages/roles/AuditFirmDashboard';
import BankClerkDashboard from './pages/roles/BankClerkDashboard';
import ReviewManagerDashboard from './pages/roles/ReviewManagerDashboard';
import AuditClientDashboard from './pages/roles/AuditClientDashboard';

function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RoleBasedRedirect() {
  const { user } = useAuth();
  
  const roleRedirects = {
    audit_firm: '/audit-firm',
    bank_clerk: '/bank-clerk',
    review_manager: '/review-manager',
    audit_client: '/audit-client'
  };

  const redirectPath = roleRedirects[user?.role] || '/dashboard';
  return <Navigate to={redirectPath} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        <Route path="audit-firm" element={
          <PrivateRoute allowedRoles={['audit_firm']}>
            <AuditFirmDashboard />
          </PrivateRoute>
        } />
        
        <Route path="bank-clerk" element={
          <PrivateRoute allowedRoles={['bank_clerk']}>
            <BankClerkDashboard />
          </PrivateRoute>
        } />
        
        <Route path="review-manager" element={
          <PrivateRoute allowedRoles={['review_manager']}>
            <ReviewManagerDashboard />
          </PrivateRoute>
        } />
        
        <Route path="audit-client" element={
          <PrivateRoute allowedRoles={['audit_client']}>
            <AuditClientDashboard />
          </PrivateRoute>
        } />
        
        <Route path="confirmations" element={<ConfirmationListPage />} />
        <Route path="confirmations/create" element={
          <PrivateRoute allowedRoles={['audit_firm']}>
            <ConfirmationCreatePage />
          </PrivateRoute>
        } />
        <Route path="confirmations/:id" element={<ConfirmationDetailPage />} />
        
        <Route path="todo-tasks" element={<TodoTaskPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
