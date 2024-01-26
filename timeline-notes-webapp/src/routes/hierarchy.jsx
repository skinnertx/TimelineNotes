import React, { useState, useEffect } from 'react';
import NestedData from '../components/NestedData';


export default function Hierarchy() {

    const [hierarchy, setHierarchy] = useState([]);
  
    useEffect(() => {
      const fetchHierarchy = async () => {
        try {
          const response = await fetch('http://localhost:8080/api/hierarchy/root');
  
          if (!response.ok) {
            throw new Error(`Failed to fetch JSON file (status ${response.status})`);
          }

  
          const hierarchyJson = await response.json();

          setHierarchy(hierarchyJson);
        } catch (error) {
          console.error('Error fetching JSON file:', error.message);
        }
      };
  
      fetchHierarchy();
    }, []); // Empty dependency array means this effect runs once on component mount

    return (
        <div>
          <h1>Data from Go Backend</h1>
          <NestedData data={hierarchy} />
        </div>
      );

}