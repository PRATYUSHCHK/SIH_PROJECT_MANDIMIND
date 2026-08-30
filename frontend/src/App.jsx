import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppShell } from './layouts/AppShell.jsx';
import { LoadingSkeleton } from './components/States.jsx';
import LoginPage from './pages/LoginPage.jsx';

const SellerDashboard = lazy(() => import('./pages/SellerDashboard.jsx'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard.jsx'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage.jsx'));
const MatchesPage = lazy(() => import('./pages/MatchesPage.jsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage.jsx'));
const IntelligencePage = lazy(() => import('./pages/IntelligencePage.jsx'));
const InventoryPage = lazy(() => import('./pages/InventoryPage.jsx'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage.jsx'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const ForecastsPage = lazy(() => import('./pages/ForecastsPage.jsx'));
const FarmerPage = lazy(() => import('./pages/FarmerPage.jsx'));
const AlertsPage = lazy(() => import('./pages/AlertsPage.jsx'));
const ModelsPage = lazy(() => import('./pages/ModelsPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'farmer' || user.role === 'buyer') return <Navigate to="/farmer" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingSkeleton />;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'farmer' || user.role === 'buyer' ? '/farmer' : '/dashboard'} /> : <LoginPage />} />
        <Route
          element={
            <Guard>
              <AppShell />
            </Guard>
          }
        >
          <Route path="/dashboard" element={<Guard roles={['seller', 'admin']}>{user?.role === 'admin' ? <AdminPage /> : <SellerDashboard />}</Guard>} />
          <Route path="/marketplace" element={<Guard roles={['seller', 'farmer', 'admin', 'buyer']}><MarketplacePage /></Guard>} />
          <Route path="/matches" element={<Guard roles={['seller', 'farmer', 'admin', 'buyer']}><MatchesPage /></Guard>} />
          <Route path="/transactions" element={<Guard roles={['seller', 'farmer', 'admin', 'buyer']}><TransactionsPage /></Guard>} />
          <Route path="/logistics" element={<Guard roles={['seller', 'farmer', 'admin', 'buyer']}><LogisticsPage /></Guard>} />
          <Route path="/intelligence" element={<Guard roles={['seller', 'admin']}><IntelligencePage /></Guard>} />
          <Route path="/inventory" element={<Guard roles={['seller', 'admin']}><InventoryPage /></Guard>} />
          <Route path="/recommendations" element={<Guard roles={['seller', 'admin']}><RecommendationsPage /></Guard>} />
          <Route path="/simulator" element={<Guard roles={['seller', 'admin']}><SimulatorPage /></Guard>} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/forecasts" element={<Guard roles={['seller', 'admin']}><ForecastsPage /></Guard>} />
          <Route path="/farmer" element={<Guard roles={['farmer', 'admin', 'seller', 'buyer']}><FarmerDashboard /></Guard>} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/models" element={<Guard roles={['admin', 'seller']}><ModelsPage /></Guard>} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? (user.role === 'farmer' || user.role === 'buyer' ? '/farmer' : '/dashboard') : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
