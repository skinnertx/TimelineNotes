import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  return (
    <nav className='navbar'>
      <ul>
        <li className='title'><Link to="/">Timeline Notes</Link></li>
        <li><Link to="/hierarchy">File Explorer</Link></li>
        <li><Link to="/timeline-hierarchy">Timelines</Link></li>
        {/* Add more links for other markdown files */}
      </ul>
      <div className='login'>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
};
