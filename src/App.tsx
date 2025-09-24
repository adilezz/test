@@ .. @@
 import HomePage from './components/pages/HomePage';
 import SearchResultsPage from './components/pages/SearchResultsPage';
 import ThesisDetailPage from './components/pages/ThesisDetailPage';
 import UploadPage from './components/pages/UploadPage';
+import LoginPage from './components/pages/LoginPage';
 import RegisterPage from './components/pages/RegisterPage';
 import ProfilePage from './components/pages/ProfilePage';
 import AdminThesisPage from './components/pages/AdminThesisPage';
+import AdminDashboard from './components/pages/AdminDashboard';
 import Header from './components/layout/Header';
 import Footer from './components/layout/Footer';
+import { useAuth } from './contexts/AuthContext';

 function App() {
+  const { loading } = useAuth();
+
+  if (loading) {
+    return (
+      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
+        <div className="text-center">
+          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
+          <p className="text-gray-600">Chargement...</p>
+        </div>
+      </div>
+    );
+  }
+
   return (
     <AuthProvider>
       <SearchProvider>
@@ .. @@
               <Routes>
                 <Route path="/" element={<HomePage />} />
                 <Route path="/search" element={<SearchResultsPage />} />
                 <Route path="/thesis/:id" element={<ThesisDetailPage />} />
+                <Route path="/login" element={<LoginPage />} />
                 <Route path="/upload" element={<UploadPage />} />
                 <Route path="/register" element={<RegisterPage />} />
                 <Route path="/profile" element={<ProfilePage />} />
+                <Route path="/admin" element={<AdminDashboard />} />
                 <Route path="/admin/thesis/:id?" element={<AdminThesisPage />} />
               </Routes>
             </main>