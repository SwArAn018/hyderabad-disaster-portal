import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch reports from MongoDB
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/reports');
      
      // MongoDB uses _id, but our frontend logic uses .id
      // We map it here so we don't have to change every dashboard file
      const formattedData = res.data.map(item => ({
        ...item,
        id: item._id, 
      }));
      
      setReports(formattedData);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Optional: Poll for updates every 10 seconds so Admin sees new reports automatically
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Add Report (Citizen Side)
  const addReport = async (data) => {
    try {
      const res = await axios.post('http://localhost:5000/api/reports', data);
      // Immediately update local state for better UX
      setReports(prev => [{ ...res.data, id: res.data._id }, ...prev]);
    } catch (error) {
      console.error("Error adding report:", error);
      alert("Failed to send report to server.");
    }
  };

  // 3. Update Task (Admin/Worker Side)
  const updateTask = async (id, data) => {
    try {
      await axios.put(`http://localhost:5000/api/reports/${id}`, data);
      
      // Update local state directly to reflect changes instantly on the UI
      setReports(prev => 
        prev.map(report => (report.id === id ? { ...report, ...data } : report))
      );
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <GlobalContext.Provider value={{ reports, addReport, updateTask, loading, fetchReports }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalData = () => useContext(GlobalContext);