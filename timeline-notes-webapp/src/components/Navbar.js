import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  return (
    <nav className='navbar'>
      <ul>
        <li className='title'>Timeline Notes</li>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/hierarchy">File Explorer</Link></li>
        <li><Link to="/timeline-hierarchy">Timelines</Link></li>
        {/* Add more links for other markdown files */}
      </ul>
    </nav>
  );
};
