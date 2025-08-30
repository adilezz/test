import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Public Pages
import HomePage from './components/pages/HomePage';
import SearchResultsPage from './components/pages/SearchResultsPage';
import ThesisDetailPage from './components/pages/ThesisDetailPage';
import RegisterPage from './components/pages/RegisterPage';
import LoginPage from './components/pages/LoginPage';

// Protected Pages
import UploadPage from './components/pages/UploadPage';
import ProfilePage from './components/pages/ProfilePage';
import MyThesesPage from './components/pages/MyThesesPage';

// Admin Pages
import AdminDashboard from './components/admin/AdminDashboard';
import AdminThesesPage from './components/admin/AdminThesesPage';
import AdminUsersPage from './components/admin/AdminUsersPage';
import AdminInstitutionsPage from './components/admin/AdminInstitutionsPage';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AdminLayout from './components/admin/AdminLayout';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <HomePage />
          </main>
          <Footer />
        </div>
      } />
      
      <Route path="/search" element={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <SearchResultsPage />
          </main>
          <Footer />
        </div>
      } />
      
      <Route path="/thesis/:id" element={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <ThesisDetailPage />
          </main>
          <Footer />
        </div>
      } />
      
      <Route path="/register" element={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <RegisterPage />
          </main>
          <Footer />
        </div>
      } />
      
      <Route path="/login" element={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <LoginPage />
          </main>
          <Footer />
        </div>
      } />

      {/* Protected Routes */}
      <Route path="/upload" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1">
              <UploadPage />
            </main>
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1">
              <ProfilePage />
            </main>
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/my-theses" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1">
              <MyThesesPage />
            </main>
            <Footer />
          </div>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </AdminRoute>
      } />
      
      <Route path="/admin/theses" element={
        <AdminRoute>
          <AdminLayout>
            <AdminThesesPage />
          </AdminLayout>
        </AdminRoute>
      } />
      
      <Route path="/admin/users" element={
        <AdminRoute>
          <AdminLayout>
            <AdminUsersPage />
          </AdminLayout>
        </AdminRoute>
      } />
      
      <Route path="/admin/institutions" element={
        <AdminRoute>
          <AdminLayout>
            <AdminInstitutionsPage />
          </AdminLayout>
        </AdminRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;