import React from 'react';
import { Navbar, Container, Button } from 'react-bootstrap';
import { LogOut, Map as MapIcon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AppNavbar = () => {
  const navigate = useNavigate();

  // Retrieve the specific user info from localStorage
  const user = JSON.parse(localStorage.getItem('user')) || { name: "Guest", role: "Unknown" };

  const handleLogout = () => {
    // 1. Clear the stored session
    localStorage.removeItem('user');
    
    // --- ADD THIS LINE ---
    // Clears the specific team name used for filtering tasks
    localStorage.removeItem('userTeam'); 

    // 2. Redirect to login page
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm py-2">
      <Container fluid>
        <Navbar.Brand className="fw-bold d-flex align-items-center">
          <MapIcon className="me-2 text-warning" size={24} />
          HYD-DISASTER <span className="text-warning ms-1">PORTAL</span>
        </Navbar.Brand>
        
        <div className="d-flex align-items-center">
          <span className="text-light me-3 small border-end pe-3 border-secondary d-flex align-items-center">
            <User size={14} className="me-1 text-info"/>
            USER: <strong className="text-uppercase text-info ms-1">{user.name}</strong>
          </span>
          
          <Button 
            variant="outline-danger" 
            size="sm" 
            className="d-flex align-items-center fw-bold"
            onClick={handleLogout}
          >
            <LogOut size={14} className="me-1" /> Logout
          </Button>
        </div>
      </Container>  
    </Navbar>
  );
};

export default AppNavbar;