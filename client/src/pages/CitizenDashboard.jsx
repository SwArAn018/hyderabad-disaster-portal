import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, InputGroup, Badge, ListGroup, Alert } from 'react-bootstrap';
import AppNavbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Navigation, Search, ImageIcon, Video, X, Clock, Send, AlertCircle, ShieldCheck } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const CitizenDashboard = () => {
  // Get the logged-in user details from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  const [position, setPosition] = useState([17.3850, 78.4867]);
  const [issueType, setIssueType] = useState('Flooding');
  const [addressSearch, setAddressSearch] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(true); 
  const [myRequests, setMyRequests] = useState([]);

  const [formData, setFormData] = useState({
    fullName: currentUser.name || "", // Default to logged-in user's name
    mobile: currentUser.phone || "",  // Default to logged-in user's phone
    landmark: "",
    pincode: "",
    imgUrl: "",
    vidUrl: "",
    consent: false,
    details: {}
  });

  // UPDATED: Sync only data belonging to the logged-in user
  const syncData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reports');
      if (response.ok) {
        const data = await response.json();
        
        // Filter: Show only reports where reporter name matches current user
        const filteredData = data.filter(r => 
          r.reporter && r.reporter.name === currentUser.name
        );
        
        setMyRequests(filteredData); // Sorting is usually handled by backend sort({timestamp: -1})
      }
    } catch (error) { console.error("Sync Error:", error); }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchAddress = async () => {
    if (!addressSearch) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}`);
      const data = await res.json();
      if (data.length > 0) {
        setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) { console.error("Search error", err); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    }, (err) => alert("Location access denied"));
  };

  // --- CHANGED: Smooth flyTo logic ---
  function MapController({ coords }) {
    const map = useMap();
    useEffect(() => { 
      if (coords) {
        map.flyTo(coords, 18, { duration: 1.5 }); 
      }
    }, [coords, map]);
    return null;
  }

  function LocationPicker() {
    useMapEvents({ click(e) { 
        setPosition([e.latlng.lat, e.latlng.lng]); 
        setShowForm(true); 
    } });
    return <Marker position={position} />;
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) return alert("Please accept the declaration to proceed.");

    const reportPayload = {
      type: issueType,
      loc: position,
      status: "Pending",
      reporter: {
        name: currentUser.name, // Strictly use the logged-in user's name for filtering
        phone: formData.mobile,
        pincode: formData.pincode,
        landmark: formData.landmark
      },
      evidence: {
        img: formData.imgUrl,
        vid: formData.vidUrl,
        categoryDetails: formData.details
      },
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      });

      if (response.ok) {
        setHasSubmitted(true);
        setShowForm(false);
        syncData();
      }
    } catch (error) { alert("Connection Error"); }
  };

  const renderOfficialFields = () => {
    switch (issueType) {
      case 'Flooding':
        return (
          <div className="border-start border-4 border-primary ps-3 mb-4 bg-light p-2 rounded">
            <Form.Label className="fw-bold small text-uppercase text-primary">3. Incident Details (Flooding)</Form.Label>
            <Form.Select className="mb-2" required onChange={(e) => setFormData({...formData, details: {...formData.details, waterLevel: e.target.value}})}>
              <option value="">Current Status of Water*</option>
              <option>Ankle level</option>
              <option>Knee level</option>
              <option>Waist level</option>
              <option>Above waist / inside houses</option>
            </Form.Select>
            <Form.Control className="mb-2" placeholder="Approx area affected (sq. meters)" onChange={(e) => setFormData({...formData, details: {...formData.details, area: e.target.value}})} />
          </div>
        );
      case 'Blocked Road':
        return (
          <div className="border-start border-4 border-warning ps-3 mb-4 bg-light p-2 rounded">
            <Form.Label className="fw-bold small text-uppercase text-warning">3. Road Obstruction Details</Form.Label>
            <Form.Select className="mb-2" required onChange={(e) => setFormData({...formData, details: {...formData.details, blockType: e.target.value}})}>
              <option value="">Type of Obstruction*</option>
              <option>Fallen tree/branch</option>
              <option>Vehicle accident</option>
              <option>Debris/landslide</option>
              <option>Pothole / road collapse</option>
            </Form.Select>
          </div>
        );
      default:
        return <Form.Control as="textarea" rows={3} placeholder="Describe the incident in detail..." className="mb-4" onChange={(e) => setFormData({...formData, details: {...formData.details, note: e.target.value}})} />;
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      <AppNavbar />
      <Container fluid className="flex-grow-1 p-0 overflow-hidden">
        <Row className="g-0 h-100">
          <Col md={7} lg={8} className="position-relative">
            <div className="position-absolute top-0 start-0 m-3 d-flex gap-2" style={{ zIndex: 1000, width: '300px' }}>
                <Form.Control 
                    placeholder="Search location..." 
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    className="shadow-sm"
                />
                <Button variant="primary" onClick={handleSearchAddress}>
                    <Search size={18}/>
                </Button>
            </div>

            <Button 
                variant="light" 
                className="position-absolute bottom-0 start-0 m-4 shadow-lg rounded-circle p-3" 
                style={{ zIndex: 1000 }}
                onClick={handleDetectLocation}
            >
                <Navigation size={24} className="text-primary" />
            </Button>

            <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker />
              <MapController coords={position} />
            </MapContainer>
          </Col>

          <Col md={5} lg={4} className="bg-white shadow-lg overflow-auto p-4 border-start" style={{zIndex: 1001}}>
            {showForm ? (
              <Form onSubmit={handleFinalSubmit}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0">OFFICIAL REPORT FORM</h5>
                    <small className="text-muted text-uppercase" style={{fontSize: '10px'}}>Disaster Management Authority</small>
                  </div>
                  <Button variant="link" className="text-muted p-0" onClick={() => setShowForm(false)}>
                    <X size={24} />
                  </Button>
                </div>

                <Alert variant="info" className="py-2 small border-0 shadow-sm mb-4">
                  <AlertCircle size={14} className="me-2" />
                  Logged in as: <strong>{currentUser.name}</strong>
                </Alert>

                <div className="mb-4">
                  <h6 className="fw-bold text-primary border-bottom pb-1 mb-3 small">1. REPORTER DETAILS</h6>
                  <Form.Control size="sm" readOnly value={currentUser.name} className="mb-2 bg-light" />
                  <Form.Control size="sm" required placeholder="Verify Mobile Number*" value={formData.mobile} className="mb-2" onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-primary border-bottom pb-1 mb-3 small">2. INCIDENT LOCATION</h6>
                  <div className="bg-dark text-white p-2 rounded mb-2 font-monospace small" style={{fontSize: '11px'}}>
                    COORDS: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                  </div>
                  <Form.Control size="sm" required placeholder="Landmark / Street Address*" className="mb-2" onChange={(e) => setFormData({...formData, landmark: e.target.value})} />
                  <Form.Control size="sm" required placeholder="Pin Code*" className="mb-2" onChange={(e) => setFormData({...formData, pincode: e.target.value})} />
                </div>

                <h6 className="fw-bold text-primary border-bottom pb-1 mb-3 small">3. INCIDENT CATEGORY</h6>
                <Form.Select className="mb-3 fw-bold border-primary text-primary" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  <option value="Flooding">🌊 Flooding / Waterlogging</option>
                  <option value="Blocked Road">🚧 Road Blockage</option>
                  <option value="Garbage">🚮 Garbage / Sanitation</option>
                  <option value="Power Outage">⚡ Power Outage</option>
                  <option value="Other">❓ General Civic Issue</option>
                </Form.Select>
                {renderOfficialFields()}

                <div className="mb-4">
                  <h6 className="fw-bold text-primary border-bottom pb-1 mb-3 small">4. EVIDENCE (LINKS)</h6>
                  <InputGroup size="sm" className="mb-2">
                    <InputGroup.Text><ImageIcon size={14}/></InputGroup.Text>
                    <Form.Control placeholder="Photo URL*" required onChange={(e) => setFormData({...formData, imgUrl: e.target.value})} />
                  </InputGroup>
                  <InputGroup size="sm" className="mb-2">
                    <InputGroup.Text><Video size={14}/></InputGroup.Text>
                    <Form.Control placeholder="Video URL (Optional)" onChange={(e) => setFormData({...formData, vidUrl: e.target.value})} />
                  </InputGroup>
                </div>

                <div className="p-2 bg-light rounded border mb-4">
                  <Form.Check 
                    type="checkbox" 
                    id="declaration" 
                    required
                    label={<small className="fw-bold" style={{fontSize: '11px'}}>I declare the information provided is correct.</small>}
                    onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                  />
                </div>

                <Button type="submit" variant="danger" className="w-100 py-2 fw-bold">
                  SUBMIT OFFICIAL REPORT
                </Button>
              </Form>
            ) : (
              <div className="py-2">
                {hasSubmitted && (
                   <Alert variant="success" className="d-flex align-items-center mb-4 border-0 shadow-sm">
                     <ShieldCheck size={20} className="me-2" />
                     <div>
                        <div className="fw-bold">Report Filed!</div>
                        <div className="small">Our teams have been notified.</div>
                     </div>
                   </Alert>
                )}

                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">MY SUBMISSIONS</h6>
                
                <ListGroup variant="flush">
                  {myRequests.length > 0 ? myRequests.slice(0, 8).map(r => (
                    // --- CHANGED: Added onClick and cursor pointer for redirect logic ---
                    <ListGroup.Item 
                      key={r._id} 
                      className="px-0 py-3 border-bottom bg-transparent" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setPosition(r.loc)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <div className="fw-bold text-primary">{r.type}</div>
                            <div className="text-muted small">
                                <Clock size={10} className="me-1"/> 
                                {new Date(r.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                        <Badge bg={r.status === 'Pending' ? 'warning' : r.status === 'Resolved' ? 'success' : 'info'}>{r.status}</Badge>
                      </div>
                    </ListGroup.Item>
                  )) : <div className="text-center text-muted py-5">You haven't submitted any reports yet.</div>}
                </ListGroup>

                <Button 
                    variant="primary" 
                    className="w-100 mt-4 fw-bold py-2 shadow-sm"
                    onClick={() => { setHasSubmitted(false); setShowForm(true); }}
                >
                    <Send size={18} className="me-2" /> SUBMIT A NEW FORM
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CitizenDashboard;