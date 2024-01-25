import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function NestedData({ data }) {
    const hasChildren = data.children && data.children.length > 0;
    const [isOpen, setIsOpen] = useState(false);

    const linkName = "/markdown/"+data.name;
  
    const toggleOpen = () => {
      if (hasChildren) {
        setIsOpen(!isOpen);
      }
    };
  
    if (!hasChildren) {
      // Render a hyperlink if the node does not have children
      return (
        <ul>
          <li>
            <Link to={linkName}>{data.name}</Link>
          </li>
        </ul>
      );
    }
  
    return (
      <ul>
        <li onClick={toggleOpen} style={{ cursor: 'pointer' }}>
          {data.name}
        </li>
        {/* Render children if the node has children and isOpen is true */}
        {isOpen && data.children && (
          <ul>
            {data.children.map(child => (
              <NestedData key={child.name} data={child} />
            ))}
          </ul>
        )}
      </ul>
    );
  }
  