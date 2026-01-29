import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import our updated pages
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// --- 1. THE SECURITY LOCK (Protected Route Component) ---
const ProtectedRoute = ({ children, allowedRole }) => {
  const storedUser = localStorage.getItem('user');
  
  if (!storedUser) {
    // No one is logged in
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(storedUser);

  if (allowedRole && user.role !== allowedRole) {
    // Logged in but trying to access a page they aren't allowed to see
    alert(`Access Denied: You do not have ${allowedRole} privileges.`);
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect the base URL to /login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* The Login Page is Public */}
        <Route path="/login" element={<Login />} />

        {/* --- 2. SECURED DASHBOARDS --- */}
        <Route 
          path="/citizen" 
          element={
            <ProtectedRoute allowedRole="citizen">
              <CitizenDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/worker" 
          element={
            <ProtectedRoute allowedRole="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* If user types a random URL, send them to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;