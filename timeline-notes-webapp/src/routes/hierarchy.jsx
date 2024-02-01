import React, { useState, useEffect } from 'react';
import TreeView from '../components/TreeView';


export default function Hierarchy() {

    const [hierarchy, setHierarchy] = useState([]);

    const [showSpinner, setShowSpinner] = useState(true);
      
    useEffect(() => {
      const fetchHierarchy = async () => {
        try {
          const response = await fetch('http://localhost:8080/api/hierarchy/root');
  
          if (!response.ok) {
            throw new Error(`Failed to fetch JSON file (status ${response.status})`);
          }

          const hierarchyJson = await response.json();

          setHierarchy(hierarchyJson);

          // allow TreeView to update all state
          const timer = setTimeout(() => {
            setShowSpinner(false); 
          }, 800); 

          // Cleanup function to clear the timer
          return () => clearTimeout(timer);
          
          

        } catch (error) {
          console.error('Error fetching JSON file:', error.message);
        }
      };
  
      fetchHierarchy();
    }, []); // Empty dependency array means this effect runs once on component mount


    
    return (
        <div>
          <h1>Data from Go Backend</h1>
          <div>
            {showSpinner ? (
              <div>
                LOADING
              </div>
            ) : (
              <TreeView data={hierarchy} />
            )}
          </div>
          
          
        </div>
      );

}