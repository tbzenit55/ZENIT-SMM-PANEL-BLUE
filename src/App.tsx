import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/Toast';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import Loader from './components/Loader';
import UserLayout from './components/layouts/UserLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Page components
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import AddFunds from './pages/AddFunds';
import Tickets from './pages/Tickets';

// Admin Page components
import AdminOverview from './pages/admin/Overview';
import AdminServices from './pages/admin/Services';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminWallets from './pages/admin/Wallets';
import AdminTickets from './pages/admin/Tickets';
import AdminSettings from './pages/admin/Settings';
import AdminLogs from './pages/admin/Logs';
import AdminProviders from './pages/admin/Providers';
import AdminNotifications from './pages/admin/Notifications';
import AdminReports from './pages/admin/Reports';

const queryClient = new QueryClient();

function MainAppRouter() {
  const { currentUser, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <Loader fullScreen />;
  }

  // Use ONLY Firebase Authentication session
  const isAuthenticated = !!currentUser;

  if (!isAuthenticated) {
    return <Auth />;
  }

  // Retrieve user role for admin routing
  const role = userProfile?.role || 'User';
  const isAdmin = role === 'Admin' || role === 'Super Admin' || role === 'admin';

  // Toggle user vs admin layout based on selected tab
  const isAdminTab = activeTab.startsWith('admin-');

  const handleTabChange = (tab: string) => {
    if (tab === 'admin-portal') {
      setActiveTab('admin-stats');
    } else {
      setActiveTab(tab);
    }
  };

  // Render correct panel page component inside layout
  if (isAdminTab && isAdmin) {
    return (
      <AdminLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'admin-stats' && <AdminOverview />}
        {activeTab === 'admin-services' && <AdminServices />}
        {activeTab === 'admin-providers' && <AdminProviders />}
        {activeTab === 'admin-orders' && <AdminOrders />}
        {activeTab === 'admin-wallets' && <AdminWallets />}
        {activeTab === 'admin-users' && <AdminUsers />}
        {activeTab === 'admin-tickets' && <AdminTickets />}
        {activeTab === 'admin-settings' && <AdminSettings />}
        {activeTab === 'admin-logs' && <AdminLogs />}
        {activeTab === 'admin-notifications' && <AdminNotifications />}
        {activeTab === 'admin-reports' && <AdminReports />}
      </AdminLayout>
    );
  }

  return (
    <UserLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'dashboard' && <Dashboard onTabChange={handleTabChange} />}
      {activeTab === 'new-order' && <NewOrder />}
      {activeTab === 'orders' && <Orders />}
      {activeTab === 'add-funds' && <AddFunds />}
      {activeTab === 'tickets' && <Tickets />}
    </UserLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <MainAppRouter />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
