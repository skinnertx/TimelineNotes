import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {

  const [loggedIn, setLoggedIn] = useState((localStorage.getItem('token') !== null ))

  useEffect(() => {
    function checkUserData() {
      const item = localStorage.getItem('token')
  
      if (item) {
        setLoggedIn(true)
      }
    }

    window.addEventListener('storage', checkUserData)

    return () => {
      window.removeEventListener('storage', checkUserData)
    }
  }, [])

  return (
    <nav className='navbar'>
      <ul>
        <li className='title'><Link to="/">Timeline Notes</Link></li>
        <li><Link to="/hierarchy">File Explorer</Link></li>
        <li><Link to="/timeline-hierarchy">Timelines</Link></li>
        {/* Add more links for other markdown files */}
      </ul>
      {loggedIn ? null :
        <div className='login'>
          <Link to="/login">Login</Link>
        </div>
      }
    </nav>
  );
};
