import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { FiSun, FiMoon, FiGlobe } from 'react-icons/fi';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { GoldRateProvider } from './context/GoldRateContext';
import { PWAProvider } from './context/PWAContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/common/Navbar';
import BottomNavigation from './components/BottomNavigation';
import FloatingInstallButton from './components/common/FloatingInstallButton';
import InstallModal from './components/common/InstallModal';
import DisclaimerModal from './components/common/DisclaimerModal';
import GlowingBackground from './components/common/GlowingBackground';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import Home from './pages/Home';
import MyGold from './pages/MyGold';
import AddGold from './pages/AddGold';
import GoldRates from './pages/GoldRates';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotUsername from './pages/ForgotUsername';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import Upgrade from './pages/Upgrade';

const AppLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-username' || location.pathname === '/forgot-password';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-300 bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Auth Route Controls (Language Switcher & Theme Switcher) */}
      {isAuthRoute && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === 'en' ? 'தமிழில் பார்க்க' : 'Switch to English'}
            aria-label="Switch Language"
            className="h-10 px-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-amber-500/30 text-slate-800 dark:text-amber-300 flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-xs hover:border-amber-400"
          >
            <FiGlobe className="w-4 h-4 text-amber-500" />
            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark/Light Mode"
            className="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-amber-500/30 text-slate-700 dark:text-amber-300 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer hover:border-amber-400"
          >
            {isDark ? <FiSun className="w-5 h-5 text-amber-400" /> : <FiMoon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      )}
      {/* Ambient Gold Radial Glow Effect matching uploaded image */}
      <GlowingBackground />

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#111726',
            color: '#F8FAFC',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 25px rgba(245, 158, 11, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#F43F5E',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {/* 1. Top Header (Navbar) */}
      {!isAuthRoute && <Navbar />}

      {/* 2. Main Dashboard & App Content Area */}
      <main
        className={
          isAuthRoute
            ? 'flex-1 w-full mx-auto relative z-10 flex items-center justify-center'
            : 'flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-8 relative z-10'
        }
      >
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-username" element={<ForgotUsername />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Vault Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-gold"
            element={
              <ProtectedRoute>
                <MyGold />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-gold"
            element={
              <ProtectedRoute>
                <AddGold />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddGold />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade"
            element={
              <ProtectedRoute>
                <Upgrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gold-rates"
            element={
              <ProtectedRoute>
                <GoldRates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* In-App Install Modal (replaces browser popup) */}
      <InstallModal />

      {/* Mandatory Post-Login Disclaimer Modal */}
      <DisclaimerModal />

      {/* Floating PWA Install Button */}
      <FloatingInstallButton />

      {/* Mobile Bottom Navigation (Hidden on Auth Pages) */}
      {!isAuthRoute && <BottomNavigation />}
    </div>
  );
};

export const App = () => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <GoldRateProvider>
              <PWAProvider>
                <NotificationProvider>
                  <BrowserRouter>
                    <AppLayout />
                  </BrowserRouter>
                </NotificationProvider>
              </PWAProvider>
            </GoldRateProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
