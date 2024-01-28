import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import includes from 'lodash/includes';
import '../styles/NestedData.css';
import FolderIcon from '../assets/folderIcon.png';


export default function NestedData({ data }) {
  const isLink = includes(data.name, '.');
  const [isOpen, setIsOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingDirectory, setIsCreatingDirectory] = useState(false);

  const linkName = "/markdown/" + data.name;

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleCreateFile = () => {
    setNewFileName('');
    setNewDirectoryName('');
    setIsCreatingFile(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleCreateDirectory = () => {
    setNewFileName('');
    setNewDirectoryName('');
    setIsCreatingDirectory(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e) => {
    if (isCreatingFile) {
      setNewFileName(e.target.value);
    } else if (isCreatingDirectory) {
      setNewDirectoryName(e.target.value);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsCreatingFile(false);
      setIsCreatingDirectory(false);
    } else if (e.key === 'Enter') {
      if (isCreatingFile && newFileName) {
        // Logic to create a new file
        let fileName = newFileName;
        if (!fileName.endsWith('.md')) {
          fileName += '.md';
        }
        const newFile = {
          name: fileName,
          children: null,
        };
        data.children.push(newFile);
      } else if (isCreatingDirectory && newDirectoryName) {
        // Logic to create a new directory
        // Append the new directory to the front of the children
        const newDirectory = {
          name: newDirectoryName,
          children: [],
        };
        data.children.unshift(newDirectory);
      }
      setIsCreatingFile(false);
      setIsCreatingDirectory(false);
    }
  };

  if (isLink) {
    // Render a hyperlink if the node has a '.' character in its name
    return (
      <ul className='NestedData'>
        --
        <li>
          <Link to={linkName}>{data.name}</Link>
        </li>
      </ul>
    );
  }

  return (
    <ul className='NestedData'>
      <div className='folderBar'>
        
        <li onClick={toggleOpen} style={{ cursor: 'pointer' }}>
          <img className='folderIcon' src={FolderIcon} alt="Folder Icon" />
          {data.name}
        </li>
        <button onClick={handleCreateFile}>Create File</button>
        <button onClick={handleCreateDirectory}>Create Directory</button>
      </div>

      {/* Render new file input if creating a file */}
      {isCreatingFile && (
        <ul>
          <li>
            <input
              type="text"
              value={newFileName}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
          </li>
        </ul>
      )}

      {/* Render new directory input if creating a directory */}
      {isCreatingDirectory && (
        <ul>
          <li>
            <input
              type="text"
              value={newDirectoryName}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
          </li>
        </ul>
      )}

      {/* Render children if the node has children and isOpen is true */}
      {isOpen && data.children && (
        <ul>
          {data.children.map((child) => (
            <NestedData key={child.name} data={child} />
          ))}
        </ul>
      )}
    </ul>
  );
}
