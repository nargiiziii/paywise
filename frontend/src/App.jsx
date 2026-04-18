import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './pages/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import Transfer from './components/transfer/Transfer';
import History from './components/history/History';
import Savings from './components/cards/Savings';
import Cards from './components/cards/Cards';
import Notifications from './components/notifications/Notifications';
import Profile from './components/auth/Profile';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import './styles/global.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-2)',
              color: 'var(--text-0)',
              border: '1px solid var(--border-1)',
              fontFamily: 'var(--font)',
              fontSize: '14px',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-0)' } },
            error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-0)' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="transfer" element={<Transfer />} />
            <Route path="history" element={<History />} />
            <Route path="savings" element={<Savings />} />
            <Route path="cards" element={<Cards />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
