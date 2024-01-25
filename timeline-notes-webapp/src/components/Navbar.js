import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/hierarchy">Hierarchy</Link></li>
        {/* Add more links for other markdown files */}
      </ul>
    </nav>
  );
};
