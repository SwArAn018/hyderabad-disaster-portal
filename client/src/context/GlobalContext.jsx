import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const GlobalContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const GlobalProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch reports from MongoDB
  // FIXED: Wrapped in useCallback to prevent infinite loops when added to dependency arrays
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/reports`);
      
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
  }, []);

  useEffect(() => {
    fetchReports();
    // Optional: Poll for updates every 10 seconds so Admin sees new reports automatically
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, [fetchReports]); // FIXED: Added fetchReports to the dependency array

  // 2. Add Report (Citizen Side)
  const addReport = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/reports`, data);
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
      await axios.put(`${API_BASE_URL}/api/reports/${id}`, data);
      
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