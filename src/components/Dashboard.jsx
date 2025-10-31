import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tableauToken, setTableauToken] = useState('');
  const [tableauConfig, setTableauConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workbooks, setWorkbooks] = useState([]);
  const [selectedWorkbook, setSelectedWorkbook] = useState(null);
  const vizContainerRef = useRef(null);
  const vizRef = useRef(null);

  useEffect(() => {
    const fetchWorkbooks = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/workbooks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWorkbooks(response.data.workbooks);
        if (response.data.workbooks.length > 0) {
          setSelectedWorkbook(response.data.workbooks[0]);
        }
      } catch (error) {
        console.error('Failed to fetch workbooks:', error);
      }
    };

    fetchWorkbooks();
  }, [navigate]);

  useEffect(() => {
    const fetchTableauToken = async () => {
      if (!selectedWorkbook) return;

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/tableau-token?workbook=${selectedWorkbook.workbook}&view=${selectedWorkbook.view}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTableauToken(response.data.tableauToken);
        setTableauConfig(response.data);
      } catch (error) {
        console.error('Failed to fetch Tableau token:', error);
        // For demo purposes, we'll show a placeholder
      } finally {
        setLoading(false);
      }
    };

    fetchTableauToken();
  }, [navigate, selectedWorkbook]);

  useEffect(() => {
    if (tableauConfig && tableauToken && vizContainerRef.current && window.tableau) {
      // Dispose of previous viz if it exists
      if (vizRef.current) {
        vizRef.current.dispose();
      }

      const vizUrl = `${tableauConfig.serverUrl}/t/${tableauConfig.site}/views/${selectedWorkbook.workbook}/${selectedWorkbook.view}`;
      const options = {
        hideTabs: true,
        hideToolbar: false,
        width: '100%',
        height: '100%',
        onFirstInteractive: function() {
          console.log('Tableau viz is interactive');
        }
      };

      // Create new viz with JWT token
      vizRef.current = new tableau.Viz(vizContainerRef.current, vizUrl, options);
    }

    // Cleanup on unmount
    return () => {
      if (vizRef.current) {
        vizRef.current.dispose();
      }
    };
  }, [tableauConfig, tableauToken, selectedWorkbook]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.header
        className="bg-white px-8 py-4 shadow-sm flex justify-between items-center"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.h1
          className="text-2xl font-bold text-gray-800"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          Dashboard Portal
        </motion.h1>
        <motion.button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Logout
        </motion.button>
      </motion.header>
      <main className="p-8">
        <div className="mb-6">
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {workbooks.map((workbook) => (
              <motion.button
                key={workbook.id}
                onClick={() => setSelectedWorkbook(workbook)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  selectedWorkbook?.id === workbook.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {workbook.name}
              </motion.button>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="bg-white p-8 rounded-lg shadow-lg h-[calc(100vh-300px)] flex items-center justify-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {loading ? (
            <motion.div
              className="text-center text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading {selectedWorkbook?.name}...</p>
            </motion.div>
          ) : selectedWorkbook ? (
            <motion.div
              className="w-full h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedWorkbook.name}</h2>
                <p className="text-gray-600">{selectedWorkbook.description}</p>
              </div>
              <div className="w-full h-full" ref={vizContainerRef}>
                {!tableauConfig || !tableauToken ? (
                  <div className="text-center text-gray-600">
                    <p>Failed to load Tableau dashboard. Please check your configuration.</p>
                    <p className="text-sm mt-2">Token: {tableauToken ? 'Available' : 'Missing'}</p>
                    <p className="text-sm">Config: {tableauConfig ? 'Available' : 'Missing'}</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="text-center text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Workbooks Available</h2>
              <p>Please check your Tableau Server configuration.</p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </motion.div>
  );
};

export default Dashboard;
