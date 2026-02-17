import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, ToggleButtonGroup, ToggleButton, Alert, Modal } from 'react-bootstrap';
import { ShieldCheck, User, HardHat, UserPlus, MapPin, Phone, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  const [role, setRole] = useState('citizen');
  const [credentials, setCredentials] = useState({ userid: '', password: '' });
  const [error, setError] = useState('');
  const [showReg, setShowReg] = useState(false);
  
  const [regDetails, setRegDetails] = useState({
    name: '',
    phone: '',
    aadhaar: '',
    address: '',
    emergencyContact: '',
    password: ''
  });
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      if (credentials.userid === 'admin123' && credentials.password === 'admin789') {
        localStorage.setItem('user', JSON.stringify({ name: "Admin Official", role: "admin" }));
        navigate('/admin');
        return;
      } else {
        setError("Invalid Admin Credentials.");
        return;
      }
    }

    try {
      // FIX 1: Changed /api/users to /api/login
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: credentials.userid, 
          password: credentials.password 
        }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'worker') {
          localStorage.setItem('userTeam', data.user.name); 
          navigate('/worker');
        } else {
          navigate('/citizen');
        }
      } else {
        setError(data.message || "Invalid Credentials.");
      }
    } catch (err) {
      setError("Database connection failed.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      // FIX 2: Changed localhost:5000 to ${API_BASE_URL}
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regDetails,
          role: 'citizen',
          dept: 'None' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Citizen Profile Created Successfully! You can now login.");
        setShowReg(false);
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (err) {
      alert("Could not connect to server.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={5}>
            <div className="text-center mb-4">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuwiRlV2mzm9K3hYWUjwABLqDxD9L5gbrTkg&s" alt="TS Emblem" style={{ height: '80px' }} />
              <h4 className="mt-3 fw-bold text-dark">Government of Telangana</h4>
              <p className="text-muted small text-uppercase fw-semibold">Disaster Response Management (A PROTOTYPE) </p>
            </div>

            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-4">
                <h3 className="text-center mb-4 fw-bold">Portal Sign In</h3>

                {error && <Alert variant="danger" className="py-2 small text-center">{error}</Alert>}
                
                <Form onSubmit={handleLogin}>
                  <div className="text-center mb-4">
                    <ToggleButtonGroup type="radio" name="roles" defaultValue={'citizen'} className="w-100 shadow-sm">
                      <ToggleButton id="tbg-citizen" value={'citizen'} variant="outline-primary" onClick={() => setRole('citizen')}>
                        <User size={16} className="me-1"/> Citizen
                      </ToggleButton>
                      <ToggleButton id="tbg-worker" value={'worker'} variant="outline-primary" onClick={() => setRole('worker')}>
                        <HardHat size={16} className="me-1"/> Worker
                      </ToggleButton>
                      <ToggleButton id="tbg-admin" value={'admin'} variant="outline-primary" onClick={() => setRole('admin')}>
                        <ShieldCheck size={16} className="me-1"/> Admin
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Official User ID / Name</Form.Label>
                    <Form.Control type="text" placeholder="Enter Full Name" required onChange={(e) => setCredentials({...credentials, userid: e.target.value})} />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold">Password</Form.Label>
                    <Form.Control type="password" placeholder="••••••••" required onChange={(e) => setCredentials({...credentials, password: e.target.value})} />
                  </Form.Group>

                  <Button type="submit" variant="primary" className="w-100 py-2 fw-bold shadow-sm rounded-3">
                    Verify & Enter
                  </Button>
                </Form>
              </Card.Body>
              
              <Card.Footer className="bg-light border-0 py-3 text-center rounded-bottom-4">
                <p className="small text-muted mb-2">Not registered with us yet?</p>
                <Button variant="outline-dark" size="sm" className="fw-bold px-4" onClick={() => setShowReg(true)}>
                  <UserPlus size={16} className="me-2"/> Create Citizen Profile
                </Button>
              </Card.Footer>
            </Card>

            <Button 
              variant="danger" 
              className="w-100 mt-3 d-flex align-items-center justify-content-center gap-2 py-3 fw-bold"
              href="tel:+1234567890"
            >
              <Phone size={20} /> CALL EMERGENCY DISPATCH
            </Button>
          </Col>
        </Row>
      </Container>

      <Modal show={showReg} onHide={() => setShowReg(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Citizen Registration Form</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          <Alert variant="info" className="small">
            Ensure your details match your Government ID for faster assistance.
          </Alert>
          <Form onSubmit={handleRegisterSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Full Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="As per Aadhaar" 
                    required 
                    onChange={(e) => setRegDetails({...regDetails, name: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Aadhaar Number</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><Fingerprint size={16}/></span>
                    <Form.Control 
                      type="text" 
                      placeholder="XXXX XXXX XXXX" 
                      maxLength="12"
                      required 
                      onChange={(e) => setRegDetails({...regDetails, aadhaar: e.target.value})}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Primary Mobile</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text"><Phone size={16}/></span>
                    <Form.Control 
                      type="tel" 
                      placeholder="+91" 
                      required 
                      onChange={(e) => setRegDetails({...regDetails, phone: e.target.value})}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Emergency Contact</Form.Label>
                  <Form.Control 
                    type="tel" 
                    placeholder="Relative's Number" 
                    required 
                    onChange={(e) => setRegDetails({...regDetails, emergencyContact: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Residential Address</Form.Label>
              <div className="input-group">
                <span className="input-group-text"><MapPin size={16}/></span>
                <Form.Control 
                  as="textarea" 
                  rows={2}
                  placeholder="Street, Mandal, District" 
                  required 
                  onChange={(e) => setRegDetails({...regDetails, address: e.target.value})}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Create Portal Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Strong password"
                required 
                onChange={(e) => setRegDetails({...regDetails, password: e.target.value})}
              />
            </Form.Group>

            <Button variant="success" type="submit" className="w-100 fw-bold py-2 shadow-sm">
              Register Profile & Secure Account
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Login;