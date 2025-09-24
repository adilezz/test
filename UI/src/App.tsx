import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import HomePage from './components/pages/HomePage';
import SearchResultsPage from './components/pages/SearchResultsPage';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ProfilePage from './components/pages/ProfilePage';
import UploadPage from './components/pages/UploadPage';
import ThesisDetailPage from './components/pages/ThesisDetailPage';
import AdminThesisPage from './components/pages/AdminThesisPage';
import AdminDashboardPage from './components/pages/AdminDashboardPage';
import AdminUniversitiesPage from './components/pages/AdminUniversitiesPage';
import AdminSchoolsPage from './components/pages/AdminSchoolsPage';
import AdminFacultiesPage from './components/pages/AdminFacultiesPage';
import AdminCategoriesPage from './components/pages/AdminCategoriesPage';
import AdminAcademicPersonsPage from './components/pages/AdminAcademicPersonsPage';
import AdminKeywordsPage from './components/pages/AdminKeywordsPage';
import AdminThesesListPage from './components/pages/AdminThesesListPage';
import AdminGeographicEntitiesPage from './components/pages/AdminGeographicEntitiesPage';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { UserRole } from './types/api';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Add AdminRoute wrapper
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Layout Component
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Routes with Layout */}
            <Route path="/*" element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/thesis/:id" element={<ThesisDetailPage />} />
                  <Route path="/universities" element={<div>Universities Page - Coming Soon</div>} />
                  <Route path="/categories" element={<div>Categories Page - Coming Soon</div>} />
                  <Route path="/about" element={<div>About Page - Coming Soon</div>} />
                  <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
                  
                  {/* Protected Routes */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/upload" element={
                    <ProtectedRoute>
                      <UploadPage />
                    </ProtectedRoute>
                  } />
                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminDashboardPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminDashboardPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/universities" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminUniversitiesPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/schools" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminSchoolsPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/faculties" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminFacultiesPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/categories" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminCategoriesPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/academic-persons" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminAcademicPersonsPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/keywords" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminKeywordsPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/geographic-entities" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminGeographicEntitiesPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/theses" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminThesesListPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/theses/new" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminThesisPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/theses/:id" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AdminThesisPage />
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                        <p className="text-gray-600 mb-8">Page non trouvée</p>
                        <Navigate to="/" replace />
                      </div>
                    </div>
                  } />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;