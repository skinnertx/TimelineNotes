import React, { useState, useEffect } from 'react';
import TimelineTreeView from '../components/TimelineTreeView';
import config from '../config';

export default function TimelineHierarchy() {

    const [hierarchy, setHierarchy] = useState([]);

    const [showSpinner, setShowSpinner] = useState(true);
      
    useEffect(() => {
      const fetchHierarchy = async () => {
        try {
          
          const tlhURL = config.backendBaseUrl + 'timelineHierarchy';
          const response = await fetch(tlhURL);
  
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
          <div>
            {showSpinner ? (
              <div>
                LOADING
              </div>
            ) : (
              <TimelineTreeView originalData={hierarchy} />
            )}
          </div>
          
          
        </div>
      );

}