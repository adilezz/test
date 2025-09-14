@@ .. @@
 import UploadPage from './components/pages/UploadPage';
 import RegisterPage from './components/pages/RegisterPage';
 import ProfilePage from './components/pages/ProfilePage';
+import AdminThesisPage from './components/pages/AdminThesisPage';
 import Header from './components/layout/Header';
 import Footer from './components/layout/Footer';
@@ .. @@
                 <Route path="/upload" element={<UploadPage />} />
                 <Route path="/register" element={<RegisterPage />} />
                 <Route path="/profile" element={<ProfilePage />} />
+                <Route path="/admin/thesis/:id?" element={<AdminThesisPage />} />
               </Routes>
             </main>