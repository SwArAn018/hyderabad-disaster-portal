import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Modal, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import AppNavbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ClipboardList, Send, Image as ImageIcon, ShieldCheck, Users, MapPin, Navigation, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const WorkerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false); 
  const [activeTask, setActiveTask] = useState(null); 
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [evidence, setEvidence] = useState({ imageUrl: '', videoUrl: '', notes: '' });
  
  const getWorkerName = () => {
    const directTeam = localStorage.getItem('userTeam');
    if (directTeam) return directTeam;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { return JSON.parse(storedUser).name; } catch (e) { return "Unassigned"; }
    }
    return "Unassigned";
  };

  const workerTeam = getWorkerName();

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reports');
      const data = await response.json();
      // Filter tasks for the team that aren't resolved yet
      const myTasks = data.filter(r => r.worker === workerTeam && r.status !== "Resolved");
      setTasks(myTasks.reverse());
    } catch (err) { console.error("Worker Sync Error:", err); }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [workerTeam]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) fetchTasks(); 
    } catch (err) { alert("Failed to update status."); }
  };

  const handleFormSubmit = async () => {
    if(!evidence.notes) return alert("Please add resolution notes.");
    try {
      const currentReport = tasks.find(t => t._id === activeTaskId);
      const response = await fetch(`http://localhost:5000/api/reports/${activeTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: "Submitted for Review",
          evidence: { 
            ...currentReport.evidence, 
            img: evidence.imageUrl, 
            vid: evidence.videoUrl, 
            notes: evidence.notes 
          }
        }),
      });
      if (response.ok) {
        setShowForm(false);
        setActiveTaskId(null);
        setEvidence({ imageUrl: '', videoUrl: '', notes: '' });
        fetchTasks();
      }
    } catch (err) { alert("Submission failed."); }
  };

  const openNavigation = (loc) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc[0]},${loc[1]}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
      <AppNavbar roleName="Field Response Unit" />
      
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold m-0 d-flex align-items-center">
            <ClipboardList className="me-2 text-primary" /> Active Assignments
          </h4>
          <Badge bg="dark" className="p-2 px-3 d-flex align-items-center">
            <Users size={14} className="me-2"/> {workerTeam}
          </Badge>
        </div>

        <Row>
          {tasks.length > 0 ? (
            tasks.map(task => (
              <Col md={6} lg={4} key={task._id} className="mb-4">
                <Card className="shadow-sm border-0 h-100 overflow-hidden">
                  <div style={{ height: '140px' }}>
                    <MapContainer center={task.loc} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} touchZoom={false} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={task.loc} />
                    </MapContainer>
                  </div>
                  
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={
                        task.status === "Arrived" ? "warning text-dark" :
                        task.status === "Accepted" ? "success" : 
                        task.status === "Submitted for Review" ? "info text-dark" : "primary"
                      }>
                        {task.status === "Submitted for Review" ? "UNDER REVIEW" : task.status.toUpperCase()}
                      </Badge>
                      <small className="text-muted font-monospace">#{task._id.slice(-5)}</small>
                    </div>

                    <h5 className="fw-bold mb-1">{task.type}</h5>
                    <p className="text-muted small mb-3">Loc: {task.reporter?.landmark || "Standard Area"}</p>

                    <div className="d-grid gap-2">
                      {/* VIEW MAP BUTTON */}
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="fw-bold d-flex align-items-center justify-content-center"
                        onClick={() => { setActiveTask(task); setShowMapModal(true); }}
                      >
                        <MapPin size={14} className="me-2 text-danger"/> VIEW MISSION MAP
                      </Button>

                      {/* WORKFLOW BUTTONS */}
                      
                      {/* STEP 1: START MISSION (For Assigned or Pending) */}
                      {(task.status === "Assigned" || task.status === "Pending") && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="fw-bold" 
                          onClick={() => handleStatusChange(task._id, "Accepted")}
                        >
                          START MISSION
                        </Button>
                      )}

                      {/* STEP 2: CONFIRM ARRIVAL (Only shows after mission started) */}
                      {task.status === "Accepted" && (
                        <Button 
                          variant="warning" 
                          size="sm" 
                          className="fw-bold shadow-sm"
                          onClick={() => handleStatusChange(task._id, "Arrived")}
                        >
                          <Clock size={14} className="me-2"/> I HAVE ARRIVED AT SITE
                        </Button>
                      )}

                      {/* STEP 3: SUBMIT RESOLUTION (Only shows after arrival confirmed) */}
                      {task.status === "Arrived" && (
                        <Button 
                          variant="dark" 
                          size="sm" 
                          className="fw-bold" 
                          onClick={() => {
                            setActiveTaskId(task._id);
                            setShowForm(true);
                          }}
                        >
                          SUBMIT RESOLUTION
                        </Button>
                      )}

                      {task.status === "Submitted for Review" && (
                        <div className="text-center p-2 bg-light rounded border">
                          <Spinner animation="grow" size="sm" variant="info" className="me-2"/>
                          <small className="text-info fw-bold">Awaiting Admin Approval</small>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          ) : (
            <Col xs={12} className="text-center py-5">
              <ShieldCheck size={60} className="text-success mb-3 opacity-25"/>
              <h5 className="text-muted">No active tasks for {workerTeam}.</h5>
            </Col>
          )}
        </Row>
      </Container>

      {/* NAVIGATION MODAL */}
      <Modal show={showMapModal} onHide={() => setShowMapModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Incident Navigation</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div style={{ height: '400px', width: '100%' }}>
            {activeTask && (
              <MapContainer center={activeTask.loc} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={activeTask.loc}>
                  <Popup><strong>{activeTask.type}</strong><br/>{activeTask.reporter?.landmark}</Popup>
                </Marker>
              </MapContainer>
            )}
          </div>
          <div className="p-3 bg-white d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-0 fw-bold">{activeTask?.type}</h6>
              <small className="text-muted">{activeTask?.reporter?.landmark}</small>
            </div>
            <Button variant="primary" className="fw-bold shadow-sm" onClick={() => openNavigation(activeTask.loc)}>
              <Navigation size={18} className="me-2"/> OPEN IN GOOGLE MAPS
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* RESOLUTION FORM */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold">Resolution Evidence</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">FIELD NOTES</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Describe the action taken..." value={evidence.notes} onChange={(e) => setEvidence({...evidence, notes: e.target.value})} />
            </Form.Group>
            <Form.Label className="small fw-bold">PROOF OF WORK (IMAGE URL)</Form.Label>
            <InputGroup className="mb-2">
              <InputGroup.Text><ImageIcon size={16}/></InputGroup.Text>
              <Form.Control placeholder="Paste Image URL here" value={evidence.imageUrl} onChange={(e) => setEvidence({...evidence, imageUrl: e.target.value})} />
            </InputGroup>
            <Button variant="success" className="w-100 fw-bold mt-3 py-2" onClick={handleFormSubmit}>
              <Send size={16} className="me-2"/> SEND FOR APPROVAL
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default WorkerDashboard;