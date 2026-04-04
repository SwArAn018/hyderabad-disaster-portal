import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Form, ListGroup, Dropdown, Modal, InputGroup, OverlayTrigger, Tooltip} from 'react-bootstrap';
import AppNavbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Rectangle } from 'react-leaflet';
import { CheckCircle, Eye, UserPlus, Inbox, Activity, ShieldAlert, Video, MapPin, PhoneCall, ImageIcon, FileText, CloudSun, AlertTriangle, Clock, Map as MapIcon, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. ADDED API BASE URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// --- Leaflet Icon Fix & Custom Icons ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ 
  iconUrl: markerIcon, 
  shadowUrl: markerShadow, 
  iconSize: [25, 41], 
  iconAnchor: [12, 41] 
});
const HYDERABAD_BOUNDS = {
  minLat: 17.20, 
  maxLat: 17.60, 
  minLng: 78.20, 
  maxLng: 78.60  
};
const isInsideHyderabad = (lat, lng) => {
  return (
    lat >= HYDERABAD_BOUNDS.minLat &&
    lat <= HYDERABAD_BOUNDS.maxLat &&
    lng >= HYDERABAD_BOUNDS.minLng &&
    lng <= HYDERABAD_BOUNDS.maxLng
  );
};

const GreenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper Components ---
const MapController = ({ coords }) => {
  const map = useMap();
useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [coords, map]);
return null;
};

// New Component: Allows Admin to click map to set coordinates in manual modal
const LocationPicker = ({ setManualData, manualData }) => {
  useMapEvents({
    click(e) {
      setManualData(prev => ({ ...prev, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) }));
    },
  });
return null;
};

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
const [workers, setWorkers] = useState([]);
  const [mapCenter, setMapCenter] = useState([17.3850, 78.4867]);
  
  const [showAuditModal, setShowAuditModal] = useState(false);
const [showManualModal, setShowManualModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
const [regData, setRegData] = useState({ name: "", password: "", dept: "URBAN_GENERAL_DEPT", phone: "" });
  const [issueType, setIssueType] = useState('Flooding');
const [manualData, setManualData] = useState({
    name: "", mobile: "", landmark: "", pincode: "", imgUrl: "", vidUrl: "", lat: 17.3850, lng: 78.4867, details: {}
  });
const stats = {
    new: reports.filter(r => ["Pending Approval", "Pending", "Pending Verification"].includes(r.status)).length,
    inProgress: reports.filter(r => ["Accepted", "In Progress", "Arrived", "Assigned"].includes(r.status)).length,
    verifying: reports.filter(r => r.status === "Submitted for Review").length,
    resolved: reports.filter(r => r.status === "Resolved").length
  };
const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [weatherGrid, setWeatherGrid] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
const fetchWeatherGrid = async () => {
    setLoadingWeather(true);
try {
      const res = await fetch(`${API_BASE_URL}/api/weather/overview`);
if (!res.ok) {
        const errorData = await res.json();
throw new Error(errorData.message || `Server Error: ${res.status}`);
      }

      const data = await res.json();
      setWeatherGrid(data);
      setShowWeatherModal(true);
} catch (err) {
      console.error("Weather Fetch Failed:", err);
      alert(`🚨 WEB SERVER ERROR: ${err.message}`);
} finally {
      setLoadingWeather(false);
    }
  };
const fetchData = async () => {
    try {
      const reportRes = await fetch(`${API_BASE_URL}/api/reports`);
const reportData = await reportRes.json();
      setReports(reportData);
      const workerRes = await fetch(`${API_BASE_URL}/api/users/workers`);
      const workerData = await workerRes.json();
      setWorkers(workerData);
const alertRes = await fetch(`${API_BASE_URL}/api/alerts`);
      const alertData = await alertRes.json();
      setAlerts(alertData);
    } catch (err) { console.error("Data load failed:", err);
}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);
const handleManualSubmit = async (e) => {
    e.preventDefault();
    const lat = parseFloat(manualData.lat);
    const lng = parseFloat(manualData.lng);
if (!isInsideHyderabad(lat, lng)) {
      alert("⚠️ OUTSIDE SERVICE AREA: Incident must be within Hyderabad city limits.");
return;
    }

    const payload = {
      type: issueType,
      loc: [lat, lng],
      status: "Pending",
      reporter: {
        name: manualData.name + " (Admin Entry)",
        phone: manualData.mobile,
        pincode: manualData.pincode,
        landmark: manualData.landmark
      },
      evidence: {
        img: manualData.imgUrl,
 
       vid: manualData.vidUrl,
        categoryDetails: manualData.details
      },
      timestamp: new Date().toISOString()
    };
try {
      const res = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
if (res.ok) {
        alert("Detailed Call-In Report Logged!");
        setShowManualModal(false);
        fetchData();
}
    } catch (err) { console.error("Manual entry failed", err); }
  };
const handleRegister = async (e) => {
    e.preventDefault();
try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regData, role: 'worker' }),
      });
if (response.ok) {
        alert(`Team ${regData.name} registered!`);
setRegData({ name: "", password: "", dept: "URBAN_GENERAL_DEPT", phone: "" });
        fetchData();
      }
    } catch (err) { console.error(err);
}
  };

  const assignWorker = async (reportId, workerDept) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Assigned", worker: workerDept }),
      });
if (response.ok) {
        fetchData(); 
      }
    } catch (err) { console.error(err);
}
  };

  const resolveTask = async (reportId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Resolved", timestamp: new Date().toISOString() }),
      });
if (response.ok) { setShowAuditModal(false); fetchData(); }
    } catch (err) { console.error(err); }
  };
const renderOfficialFields = () => {
    switch (issueType) {
      case 'Flooding':
        return (
          <Form.Select className="mb-2" required onChange={(e) => setManualData({...manualData, details: {...manualData.details, waterLevel: e.target.value}})}>
            <option value="">Water Level Status*</option>
            <option>Ankle level</option><option>Knee level</option><option>Waist level</option><option>Above waist</option>
          </Form.Select>
        );
case 'Blocked Road':
        return (
          <Form.Select className="mb-2" required onChange={(e) => setManualData({...manualData, details: {...manualData.details, blockType: e.target.value}})}>
            <option value="">Type of Obstruction*</option>
            <option>Fallen tree</option><option>Vehicle accident</option><option>Debris</option>
          </Form.Select>
        );
default:
        return <Form.Control as="textarea" rows={2} placeholder="Additional Details..." onChange={(e) => setManualData({...manualData, details: {...manualData.details, note: e.target.value}})} />;
}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f7f6' }}>
      <AppNavbar roleName="OFFICIAL ADMIN" />
      
      <Container fluid className="p-4">
        {/* LIVE PROACTIVE ALERTS BOX */}
        {alerts.length > 0 && (
          <Row className="mb-3">
            <Col>
           
   <div className="alert alert-warning border-warning shadow-sm mb-0 p-3 d-flex align-items-center gap-3">
                <AlertTriangle size={24} className="text-danger flex-shrink-0" />
                <div className="flex-grow-1">
                  <div className="fw-bold text-danger">⚠️ PROACTIVE SENSOR ALERTS:</div>
                  <div className="text-dark small">
        
            {alerts.map((alert, index) => (
                      <span key={alert._id || index} className="me-3">
                        <strong>[{alert.areaName || 'Citywide'}]</strong> {alert.title} - {alert.message}
                        {index < alerts.length - 1 ?
' | ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
      
      </Col>
          </Row>
        )}
        <Row className="mb-4 g-3 text-center">
          <Col md={3}><Card className="bg-warning text-dark border-0 shadow-sm"><Card.Body className="fw-bold">NEW: {stats.new}</Card.Body></Card></Col>
          <Col md={3}><Card className="bg-primary text-white border-0 shadow-sm"><Card.Body className="fw-bold">IN FIELD: {stats.inProgress}</Card.Body></Card></Col>
          <Col md={3}><Card className="bg-info text-white border-0 shadow-sm"><Card.Body className="fw-bold">VERIFYING: {stats.verifying}</Card.Body></Card></Col>
          <Col md={3}><Card className="bg-success 
text-white border-0 shadow-sm"><Card.Body className="fw-bold">RESOLVED: {stats.resolved}</Card.Body></Card></Col>
        </Row>

        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm overflow-hidden" style={{ height: '750px' }}>
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                <span><Activity size={18} className="me-2 text-primary"/> Geospatial Incident Control</span>
       
         <div className="d-flex gap-2">
                  <Button 
                    variant="outline-info" 
                    size="sm" 
                    className="fw-bold d-flex align-items-center" 
     
               onClick={fetchWeatherGrid} 
                    disabled={loadingWeather}
                  >
                    <CloudSun size={16} className="me-2" /> 
                    {loadingWeather ?
'FETCHING...' : 'WEATHER GRID'}
                  </Button>
                  
                  <Button variant="danger" size="sm" className="fw-bold" onClick={() => setShowManualModal(true)}>
                    <PhoneCall size={16} className="me-2" /> LOG CALL-IN REPORT
           
       </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    
              
                  <Rectangle 
                    bounds={[[HYDERABAD_BOUNDS.minLat, HYDERABAD_BOUNDS.minLng], [HYDERABAD_BOUNDS.maxLat, HYDERABAD_BOUNDS.maxLng]]} 
                    pathOptions={{ color: 'red', weight: 1, fillOpacity: 0.05, dashArray: '5, 10' }}
             
     />

                  <MapController coords={mapCenter} />
                  
                  {showManualModal && <LocationPicker setManualData={setManualData} manualData={manualData} />}
                  
                
  {showManualModal && manualData.lat && (
                    <Marker position={[manualData.lat, manualData.lng]} icon={DefaultIcon} />
                  )}

                  {reports
                    .filter(r => {
            
          if (r.status !== "Resolved") return true;
const resolvedTime = new Date(r.timestamp).getTime();
                      const currentTime = new Date().getTime();
return (currentTime - resolvedTime) < (24 * 60 * 60 * 1000);
})
                    .map(r => (
                      <Marker 
                        key={r._id} 
                        position={r.loc} 
     
                   icon={r.status === "Resolved" ? GreenIcon : DefaultIcon}
                      >
                        <Popup>
                          <div className="text-center">
  
                          {r.status === "Resolved" && <Badge bg="success" className="mb-1">Recently Resolved</Badge>}
                            <br/>
                            <strong className="text-primary">{r.type}</strong><br/>
          
                  <small>{r.reporter?.landmark}</small><br/>
                            {r.weatherContext && (
                              <div className="small text-muted mt-1 border-top pt-1">
                 
               <CloudSun size={12} className="me-1"/> 
                                {r.weatherContext.temp}°C | {r.weatherContext.condition}
                              </div>
                  
          )}
                            <Button size="sm" variant="link" onClick={() => { setSelectedReport(r);
setShowAuditModal(true); }}>Audit Details</Button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
      
          </MapContainer>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <div className="d-flex flex-column gap-4">
              <Card className="border-0 shadow-sm">
            
    <Card.Header className="bg-dark text-white fw-bold"><UserPlus size={18} className="me-2"/> Register Field Team</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleRegister}>
                    <Row className="g-2">
                      <Col md={6}><Form.Control size="sm" placeholder="Name" required value={regData.name} onChange={(e) => setRegData({...regData, name: 
e.target.value})} /></Col>
                      <Col md={6}><Form.Control size="sm" type="password" placeholder="Pass" required value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} /></Col>
                      <Col md={6}>
                        <Form.Select size="sm" value={regData.dept} onChange={(e) => setRegData({...regData, dept: e.target.value})}>
           
               <option value="URBAN_WATER_DEPT">Water & Flood</option>
                          <option value="URBAN_INFRA_DEPT">Infrastructure</option>
                          <option value="URBAN_SANITATION_DEPT">Sanitation</option>
                          <option value="URBAN_POWER_DEPT">Power/Electric</option>
 
                         <option value="URBAN_GENERAL_DEPT">General Control</option>
                        </Form.Select>
                      </Col>
                      <Col md={6}><Form.Control size="sm" placeholder="Phone" required 
value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} /></Col>
                    </Row>
                    <Button variant="success" size="sm" type="submit" className="w-100 mt-2 fw-bold">CREATE ACCOUNT</Button>
                  </Form>
                </Card.Body>
             
 </Card>

              {/* INCOMING FEED CARD */}
              <Card className="border-0 shadow-sm border-start border-warning border-4">
                <Card.Header className="bg-white fw-bold d-flex justify-content-between">
                  <span><Inbox size={18} className="me-2 text-warning"/> Incoming Feed</span>
                  <Badge 
bg="warning" text="dark">{stats.new}</Badge>
                </Card.Header>
                <Card.Body className="p-0 overflow-auto" style={{ maxHeight: '200px' }}>
                  <ListGroup variant="flush">
                    {reports.filter(r => ["Pending Approval", "Pending", "Pending Verification"].includes(r.status)).map(r => (
              
        <ListGroup.Item key={r._id} onClick={() => setMapCenter(r.loc)} style={{cursor:'pointer'}} className="d-flex justify-content-between align-items-center">
                        <small className="fw-bold">{r.type}</small>
                        <Dropdown onClick={(e) => e.stopPropagation()}>
                          <Dropdown.Toggle size="sm" variant="outline-primary">Assign</Dropdown.Toggle>
    
                      <Dropdown.Menu>
                            {workers.map(w => (
                              <Dropdown.Item key={w._id} onClick={() => assignWorker(r._id, w.dept)}>
             
                   <div className="d-flex justify-content-between align-items-center" style={{minWidth: '180px'}}>
                                  <div>
                                    <div className="fw-bold">{w.name}</div>
     
                               <small className="text-muted">{w.dept}</small>
                                  </div>
                                  
<Badge bg="secondary" pill style={{fontSize: '0.6rem'}}>Assign</Badge>
                                </div>
                              </Dropdown.Item>
                            ))}
      
                    </Dropdown.Menu>
                        </Dropdown>
                      </ListGroup.Item>
                    ))}
              
    </ListGroup>
                </Card.Body>
              </Card>

              {/* --- NEW: ACTIVE OPERATIONS CARD --- */}
              <Card className="border-0 shadow-sm border-start border-primary border-4">
                <Card.Header className="bg-white fw-bold d-flex justify-content-between">
      
            <span><Activity size={18} className="me-2 text-primary"/> Active Operations</span>
                  <Badge bg="primary">{stats.inProgress}</Badge>
                </Card.Header>
                <Card.Body className="p-0 overflow-auto" style={{ maxHeight: '200px' }}>
                  <ListGroup variant="flush">
       
             {reports
                      .filter(r => ["Accepted", "In Progress", "Arrived", "Assigned"].includes(r.status))
                      .map(r => (
                        <ListGroup.Item 
          
                key={r._id} 
                          onClick={() => setMapCenter(r.loc)} 
                          style={{cursor:'pointer'}} 
                          className="d-flex 
justify-content-between align-items-center"
                        >
                          <div>
                            <small className="fw-bold d-block">{r.type}</small>
                   
         <span className="text-muted" style={{fontSize: '0.75rem'}}>
                              Team: {r.worker ||
"Unspecified"}
                            </span>
                          </div>
                          
                    
      <div className="d-flex align-items-center gap-2">
                            <Badge bg={r.status === "Arrived" ?
"success" : "primary"} style={{fontSize: '0.7rem'}}>
                              {r.status.toUpperCase()}
                            </Badge>
                            <Button 
         
                     variant="outline-secondary" 
                              size="sm" 
                              style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem'}}
             
                 onClick={(e) => { 
                                e.stopPropagation();
setSelectedReport(r); 
                                setShowAuditModal(true); 
                              }}
                            >
                              Details
                            </Button>
            
              </div>
                        </ListGroup.Item>
                      ))}
                    {reports.filter(r => ["Accepted", "In Progress", "Arrived", "Assigned"].includes(r.status)).length === 0 && (
          
            <div className="text-center text-muted p-3 small">
                        No active field operations.
                      </div>
                    )}
               
   </ListGroup>
                </Card.Body>
              </Card>

              {/* QUALITY ASSURANCE CARD */}
              <Card className="border-0 shadow-sm border-start border-info border-4">
                <Card.Header className="bg-white fw-bold d-flex justify-content-between">
          
        <span><ShieldAlert size={18} className="me-2 text-info"/> Quality Assurance</span>
                  <Badge bg="info">{stats.verifying}</Badge>
                </Card.Header>
                <Card.Body className="p-0 overflow-auto" style={{ maxHeight: '200px' }}>
                  <ListGroup variant="flush">
           
         {reports.filter(r => r.status === "Submitted for Review").map(r => (
                      <ListGroup.Item key={r._id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <small className="fw-bold d-block">{r.type}</small>
     
                     {r.weatherContext?.isHazardous && <Badge bg="danger" style={{fontSize: '0.6rem'}}>HAZARDOUS OPS</Badge>}
                        </div>
                        <Button variant="info" size="sm" className="text-white" onClick={() => { setSelectedReport(r);
setShowAuditModal(true); }}>Inspect</Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
         
   </div>
          </Col>
        </Row>
      </Container>

      {/* MANUAL ENTRY MODAL */}
      <Modal show={showManualModal} onHide={() => setShowManualModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="fs-6 fw-bold">OFFICIAL MANUAL REPORT ENTRY</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
        
  <div className="alert alert-info py-2 small mb-3">
             <MapPin size={14} className="me-1"/> <strong>Tip:</strong> Click anywhere on the map behind this modal to auto-fill coordinates.
</div>
          <Form onSubmit={handleManualSubmit}>
            <Row className="mb-4">
              <Col md={6}>
                <h6 className="fw-bold text-danger border-bottom pb-1 small mb-3">1.
REPORTER DETAILS</h6>
                <Form.Control size="sm" required placeholder="Citizen Full Name*" className="mb-2" onChange={(e) => setManualData({...manualData, name: e.target.value})} />
                <Form.Control size="sm" required placeholder="Mobile Number*" className="mb-2" onChange={(e) => setManualData({...manualData, mobile: e.target.value})} />
              </Col>
              <Col md={6}>
               
 <h6 className="fw-bold text-danger border-bottom pb-1 small mb-3">2. GEOSPATIAL LOCATION</h6>
                <Row className="g-2 mb-2">
                  <Col><Form.Control size="sm" type="number" step="any" placeholder="Latitude" value={manualData.lat} onChange={(e) => setManualData({...manualData, lat: e.target.value})} /></Col>
                  <Col><Form.Control size="sm" type="number" step="any" placeholder="Longitude" value={manualData.lng} onChange={(e) => setManualData({...manualData, lng: e.target.value})} /></Col>
               
 </Row>
                <Form.Control size="sm" required placeholder="Landmark / Street Address*" className="mb-2" onChange={(e) => setManualData({...manualData, landmark: e.target.value})} />
                <Form.Control size="sm" required placeholder="Pin Code*" onChange={(e) => setManualData({...manualData, pincode: e.target.value})} />
              </Col>
            </Row>

            <h6 className="fw-bold text-danger border-bottom pb-1 small 
mb-3">3. CATEGORY & INCIDENT DETAILS</h6>
            <Form.Select className="mb-3 fw-bold border-danger text-danger" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
              <option value="Flooding">🌊 Flooding / Waterlogging</option>
              <option value="Blocked Road">🚧 Road Blockage</option>
              <option value="Garbage">🚮 Garbage / Sanitation</option>
              <option value="Power Outage">⚡ Power Outage</option>
    
          <option value="Other">❓ General Issue</option>
            </Form.Select>
            {renderOfficialFields()}

            <div className="mt-4">
              <h6 className="fw-bold text-danger border-bottom pb-1 small mb-3">4.
EVIDENCE ATTACHMENTS</h6>
              <InputGroup size="sm" className="mb-2">
                <InputGroup.Text><ImageIcon size={14}/></InputGroup.Text>
                <Form.Control placeholder="External Photo URL" onChange={(e) => setManualData({...manualData, imgUrl: e.target.value})} />
              </InputGroup>
              <InputGroup size="sm">
            
    <InputGroup.Text><Video size={14}/></InputGroup.Text>
                <Form.Control placeholder="External Video URL" onChange={(e) => setManualData({...manualData, vidUrl: e.target.value})} />
              </InputGroup>
            </div>

            <Button type="submit" variant="danger" className="w-100 mt-4 fw-bold py-2 shadow">
              CONFIRM & PIN TO LIVE MAP
      
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* WEATHER OVERVIEW MODAL */}
      <Modal show={showWeatherModal} onHide={() => setShowWeatherModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-info text-white border-0">
          <Modal.Title className="fs-6 fw-bold">
            <CloudSun size={20} className="me-2"/> HYDERABAD SATELLITE OVERVIEW
       
        </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          <Row className="g-3">
            {weatherGrid.map((zone, idx) => (
              <Col md={4} key={idx}>
                <Card className={`h-100 shadow-sm border-0 ${zone.isHazardous ?
'border-top border-danger border-4' : 'border-top border-success border-4'}`}>
                  <Card.Body className="text-center">
                    <h6 className="fw-bold mb-1 text-uppercase small text-muted">{zone.areaName}</h6>
                    <div className="display-6 my-2 fw-bold">{zone.temp}°C</div>
                    
       
             <Badge bg={zone.isHazardous ?
"danger" : "success"} className="px-3 py-2 mb-3">
                      {zone.condition?.toUpperCase()}
                    </Badge>

                    {(zone.aqi || zone.aqiData?.aqi) && (
                      <OverlayTrigger
       
                 placement="top"
                        overlay={
                          <Tooltip id={`tooltip-aqi-${idx}`}>
                            {(zone.aqi || zone.aqiData?.aqi) >= 
(zone.zoneType === "Residential" ? 3 : 4)
                              ? `Threshold breached for ${zone.zoneType || 'Residential'} Zone`
                              : `Air quality within safe limits for ${zone.zoneType || 'Residential'} Zone`}
                 
         </Tooltip>
                        }
                      >
                        <Badge 
                    
      bg={(zone.aqi || zone.aqiData?.aqi) >= (zone.zoneType === "Residential" ? 3 : 4) ? "danger" : "info"} 
                          className="px-3 py-2"
                          style={{ cursor: 'pointer' }}
                       
 >
                          AQI: {zone.aqi ||
zone.aqiData?.aqi}
                        </Badge>
                      </OverlayTrigger>
                    )}

                    {zone.compoundHazards && zone.compoundHazards.length > 0 && (
        
                      <div className="mt-2 p-2 bg-danger-subtle text-danger rounded border border-danger border-opacity-25 text-start">
                        {zone.compoundHazards.map((hazard, hIdx) => (
                          <div key={hIdx} className="mb-1 last-mb-0">
                     
       <div className="fw-bold small d-flex align-items-center">
                              <ShieldAlert size={12} className="me-1" />
                              {hazard.type} Detected!
                         
   </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {hazard.instruction}
                            </div>
      
                    </div>
                        ))}
                      </div>
                    )}
              
    </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <div className="text-center mt-3 small text-muted">
            <Clock size={12} className="me-1"/> Data synced with OpenWeatherMap Satellite Feed
          
</div>
        </Modal.Body>
      </Modal>

      {/* AUDIT MODAL WITH WORKER VERIFICATION */}
      <Modal show={showAuditModal} onHide={() => setShowAuditModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title className="fs-6">Incident Audit & Truth Check</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
        
            <>
              {selectedReport?.weatherContext && (
                <Card className="mb-3 border-0 bg-light shadow-sm">
                  <Card.Body className="d-flex align-items-center justify-content-between">
                    <div>
                   
   <h6 className="mb-0 fw-bold d-flex align-items-center">
                        <CloudSun className="me-2 text-primary" size={20}/> Satellite Truth Check
                      </h6>
                      <small className="text-muted">Live conditions at coordinates during report</small>
             
       </div>
                    <div className="text-end">
                      <div className="fw-bold fs-5">{selectedReport?.weatherContext?.temp}°C</div>
                      <Badge bg={selectedReport?.weatherContext?.isHazardous ?
"danger" : "success"}>
                        {selectedReport?.weatherContext?.condition?.toUpperCase() ||
"CLEAR"}
                      </Badge>
                    </div>
                  </Card.Body>
                  {(() => {
                    
const isClear = !selectedReport.weatherContext?.isHazardous;
                    const condition = selectedReport.weatherContext?.condition?.toLowerCase() || '';
                    const isRaining = condition.includes('rain') || condition.includes('storm') || condition.includes('drizzle');
                    
                    if (selectedReport.type === "Flooding" && 
isClear) {
                      return (
                        <div className="p-2 bg-warning-subtle text-center small border-top text-danger fw-bold">
                          <AlertTriangle size={14} className="me-1"/> POTENTIAL DISCREPANCY: User reported flooding during clear weather.
         
               </div>
                      );
                    }

                    if (selectedReport.type === "Power Outage" && isRaining) {
                
                      return (
                        <div className="p-2 bg-info-subtle text-center small border-top text-info fw-bold">
                          <CloudSun size={14} className="me-1"/> CONTEXT: Heavy weather detected.
Outage might be storm-related.
                        </div>
                      );
}

                    return null;
})()}
                </Card>
              )}

              {selectedReport?.reliabilityScore !== undefined && (
                <Card className="mb-3 border-0 shadow-sm bg-dark text-white overflow-hidden">
                  <Card.Body className="p-3">
           
         <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="fw-bold text-uppercase tracking-wider">
                        <ShieldAlert size={14} className="me-2 text-info"/> Springer-V2 Trust Score
                      </small>
          
                    <Badge bg={selectedReport?.reliabilityScore > 75 ? "success" : "warning"}>
                        {selectedReport.reliabilityScore}% Match
                      </Badge>
                    </div>
              
      <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                      <div 
                        style={{ 
                          width: `${selectedReport.reliabilityScore}%`, 
          
                height: '100%', 
                          backgroundColor: selectedReport.reliabilityScore > 75 ?
'#28a745' : '#ffc107',
                          borderRadius: '10px',
                          transition: 'width 1.5s ease-in-out'
                        }} 
                 
     />
                    </div>
                    <p className="mt-2 mb-0" style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                      <strong>AI Analysis:</strong> {selectedReport?.trustReason ||
"Contextual validation complete."}
                    </p>
                  </Card.Body>
                </Card>
              )}

              {selectedReport?.worker && (
              
                <Card className="mb-3 border-start border-4 border-primary shadow-sm">
                  <Card.Body>
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <ShieldAlert size={18} className="me-2 text-primary"/> Field Team Accountability
                    </h6>
   
                 <Row className="g-3">
                      <Col md={6}>
                        <div className="p-2 bg-light rounded border text-center">
                          <Clock size={16} className="text-muted mb-1"/>
 
                         <div className="small fw-bold">ARRIVAL TIME</div>
                          <div className="text-primary fw-bold">
                            {selectedReport?.arrivalTimestamp ? new Date(selectedReport.arrivalTimestamp).toLocaleTimeString() : "Pending Arrival"}
          
                </div>
                        </div>
                      </Col>
                      <Col md={6}>
               
         <div className={`p-2 rounded border text-center ${selectedReport?.verifiedLocation?.distanceFromSite <= 100 ?
'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          <MapIcon size={16} className="mb-1"/>
                          <div className="small fw-bold">GPS VERIFICATION</div>
                          <div className="fw-bold">
            
                {selectedReport?.verifiedLocation?.distanceFromSite 
                              ?
`${selectedReport.verifiedLocation.distanceFromSite.toFixed(0)}m away` 
                              : "Awaiting Geofence"}
                          </div>
                        </div>
                
      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              <Table bordered size="sm" className="mb-0 bg-white shadow-sm rounded overflow-hidden">
     
           <tbody>
                  <tr><th className="bg-light w-25 p-2">Reporter</th><td className="p-2">{selectedReport.reporter?.name ||
"Anonymous"}</td></tr>
                  <tr><th className="bg-light p-2">Landmark</th><td className="p-2">{selectedReport.reporter?.landmark}</td></tr>
                  <tr><th className="bg-light p-2">Assigned To</th><td className="p-2 fw-bold text-primary">{selectedReport.worker ||
"Unassigned"}</td></tr>
                  <tr><th className="bg-light p-2">Status</th><td className="p-2"><Badge bg="warning" text="dark">{selectedReport.status}</Badge></td></tr>
                  <tr><th className="bg-light p-2">Details</th><td className="p-2">
                    {selectedReport.evidence?.categoryDetails ?
(
                      <ul className="mb-0 ps-3">
                        {Object.entries(selectedReport.evidence.categoryDetails).map(([k, v]) => (
                          <li key={k}><strong>{k}:</strong> {String(v)}</li>
                     
   ))}
                      </ul>
                    ) : "No extra parameters recorded."}
                  </td></tr>
                  <tr>
              
                    <th className="bg-light p-2">Media Evidence</th>
                    <td className="p-2">
                      <div className="d-flex gap-2 align-items-center">
                        {selectedReport.evidence?.img ? (
                          // Check if it's an uploaded file (starts with /uploads) or a regular URL
                          selectedReport.evidence.img.startsWith('/uploads') ? (
                            <img 
                              src={`${API_BASE_URL}${selectedReport.evidence.img}`} 
                              alt="Evidence" 
                              style={{width:'200px', height:'150px', objectFit:'cover', borderRadius:'4px'}} 
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Found';
                              }}
                            />
                          ) : (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => window.open(selectedReport.evidence.img.startsWith('http') ? selectedReport.evidence.img : `https://${selectedReport.evidence.img}`, '_blank')}
                            >
                              <ExternalLink size={14} className="me-1"/> View External Link
                            </Button>
                          )
                        ) : <Badge bg="secondary">No Evidence URL</Badge>}
      
                        {selectedReport.evidence?.vid ? (
                          <Button variant="outline-dark" size="sm" onClick={() => window.open(selectedReport.evidence.vid, '_blank')}>
                            <Video size={14} className="me-1"/> Watch Video
                          </Button>
                        ) : <Badge bg="secondary">No Video</Badge>}
                      </div>
                    </td>
                  </tr>
                </tbody>
      
        </Table>

              {selectedReport.status === "Submitted for Review" && (
                <Button variant="success" className="w-100 mt-3 fw-bold" onClick={() => resolveTask(selectedReport._id)}>
                  <CheckCircle size={18} className="me-2"/> APPROVE & RESOLVE TICKET
                </Button>
         
     )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminDashboard;