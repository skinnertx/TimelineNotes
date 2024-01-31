import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import includes from 'lodash/includes';
import '../styles/NestedData.css';
import FolderIcon from '../assets/folderIcon.png';
import purpFolder from '../assets/purpFolder.png';
import purpFolderAdd from '../assets/purpFolderAdd.png';
import purpFile from '../assets/purpFile.png';
import purpFileAdd from '../assets/purpFileAdd.png';
import purpPlus from '../assets/add.png';


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

  function toggleIcons(event) {
    console.log(event.target);
    const button = event.target.closest('.addButton');
    console.log(button);
    if (button) {
        const sibling = button.nextElementSibling;
        if (sibling && sibling.classList.contains('additional-icons')) {
            sibling.classList.toggle('show');
        }
    }
  }

  // TODO show file explorer on left side of screen,
  // hierarchy on right side of screen

  return (
    <ul className='NestedData'>
      <div className='folderIcons'>

        <li onClick={toggleOpen} style={{ cursor: 'pointer' }}>
          <img className='folderIcon' src={purpFolder} alt="Folder Icon" />
          {data.name}
        </li>
        
        <button className="addButton" onClick={toggleIcons}>
            <img className='folderIcon' src={purpPlus} alt="Folder Icon" />
        </button>

        <div className="additional-icons">
          <button onClick={handleCreateFile} className='addButton'>
            <img className='folderIcon' src={purpFileAdd} alt="File Add Icon" />
          </button>
          <button onClick={handleCreateDirectory} className='addButton'>
            <img className='folderIcon' src={purpFolderAdd} alt="Folder Add Icon" />
          </button>
        </div>

        
        
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
