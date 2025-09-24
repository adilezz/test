@@ .. @@
-import React, { createContext, useContext, useState, ReactNode } from 'react';
+import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
+import { apiService } from '../services/api';
+import { User as ApiUser } from '../types/api';

-interface User {
-  id: string;
-  email: string;
-  name: string;
-  institution: string;
-  role: 'student' | 'researcher' | 'admin';
-  avatar?: string;
-}
+interface User extends ApiUser {}

 interface AuthContextType {
   user: User | null;
+  loading: boolean;
   login: (email: string, password: string) => Promise<void>;
-  register: (userData: Partial<User> & { password: string }) => Promise<void>;
+  register: (userData: any) => Promise<void>;
   logout: () => void;
   isAuthenticated: boolean;
 }

@@ .. @@
 export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState(true);
+
+  useEffect(() => {
+    const initAuth = async () => {
+      const token = localStorage.getItem('access_token');
+      if (token) {
+        try {
+          const currentUser = await apiService.getCurrentUser();
+          setUser(currentUser);
+        } catch (error) {
+          localStorage.removeItem('access_token');
+        }
+      }
+      setLoading(false);
+    };
+
+    initAuth();
+  }, []);

   const login = async (email: string, password: string) => {
-    // Mock login - in real app would call API
-    const mockUser: User = {
-      id: '1',
-      email,
-      name: 'Dr. Ahmed Benali',
-      institution: 'Université Mohammed Premier de Oujda',
-      role: 'researcher'
-    };
-    setUser(mockUser);
+    const response = await apiService.login({ email, password });
+    setUser(response.user);
   };

-  const register = async (userData: Partial<User> & { password: string }) => {
-    // Mock registration - in real app would call API
-    const newUser: User = {
-      id: Date.now().toString(),
-      email: userData.email!,
-      name: userData.name!,
-      institution: userData.institution!,
-      role: userData.role || 'student'
-    };
-    setUser(newUser);
+  const register = async (userData: any) => {
+    const newUser = await apiService.register(userData);
+    setUser(newUser);
   };

   const logout = () => {
+    apiService.logout();
     setUser(null);
   };

@@ .. @@
     <AuthContext.Provider value={{
       user,
+      loading,
       login,
       register,
       logout,
       isAuthenticated: !!user
     }}>
       {children}
     </AuthContext.Provider>
   );
 }