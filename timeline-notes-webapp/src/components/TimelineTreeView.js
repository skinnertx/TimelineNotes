import React, {useEffect, useState} from 'react';
import '../styles/TimelineTreeView.css';
import purpFolder from '../assets/purpFolder.png';
import purpFolderAdd from '../assets/purpFolderAdd.png'
import blueFile from '../assets/blueFile.png';
import backArrow from '../assets/replyArrow.png'
import folderIcon from '../assets/folderIcon.png'
import { useNavigate } from 'react-router-dom';

export default function TimelineTreeView({originalData}) {

    // stack that tracks the current path through file tree
    // starts with the root folder implied 
    // IMPORTANT!!!! EMPTY ARRAY IS THE ROOT FOLDER
    const [currentPath, setCurrentPath] = useState([]);
    // set that tracks which nodes are expanded currently
    const [expandedNodes, setExpandedNodes] = useState(new Set([originalData.name]));

    const [viewedNode, setviewedNode] = useState();

    const [data, setData] = useState();

    const navigate = useNavigate();

    useEffect(() => {
      
      setviewedNode(originalData);
      setData(originalData)
      
    }, [originalData]);

    // when a node is clicked, add it to the current path and expand it
    const handleNodeClick = (nodeName) => {     

        // Check if the clicked node is a direct child of the current node
        // TODO, if it is not, try checking upper levels to find it?
        if (!viewedNode.children) return;
        const clickedNode = viewedNode.children.find(child => child.name === nodeName);
        if (clickedNode) {
          setCurrentPath([...currentPath, nodeName]);
          setExpandedNodes(new Set(expandedNodes.add(nodeName)));
          setviewedNode(clickedNode);
        } else {
          // need to trace from path down to find the node
          // build up the stack of nodes from the root to the current node
          const nodeStack = [];
          let currentNode = data;
          for (const pathNode of currentPath) {
            nodeStack.push(currentNode);
            currentNode = currentNode.children.find(child => child.name === pathNode);
            if (!currentNode) return;
          }

          // search the stack for the clicked node from the bottom up
          for (let i = nodeStack.length - 1; i >= 0; i--) {
            const childNode = nodeStack[i].children.find(child => child.name === nodeName);
            if (childNode) {
              const newCurrentPath = currentPath.slice(0, i);
              setCurrentPath([...newCurrentPath, nodeName]);
              setExpandedNodes(new Set(newCurrentPath.concat(nodeName)));
              setviewedNode(childNode);
              return;
            }
          }

        }
      };
    
    // when the back button is clicked, remove the last node from the current path
    const handleBackClick = () => {
        const newCurrentPath = currentPath.slice(0, -1);
        setCurrentPath(newCurrentPath);
        setExpandedNodes(new Set(newCurrentPath));
        // set view to the last node in the new current path
        let currentNode = data;
        for (const pathNode of newCurrentPath) {
          currentNode = currentNode.children.find(child => child.name === pathNode);
          if (!currentNode) return; // Exit if the current node is not found
        }
        setviewedNode(currentNode);
      }

    // check if a node is expanded
    // TODO, if file has same name later in hierarrchy, this breaks
    const isNodeExpanded = (nodeName) => {
        return expandedNodes.has(nodeName);
    };

    const resetToRoot = () => {
      setCurrentPath([]);
      setExpandedNodes(new Set([data.name]));
      setviewedNode(data);
    }

    // render the tree recursively, this is the kickstarter, deals with root case
    const renderTree = (node) => {
        if (!node || !node.children || node.children.length === 0) {
          return null;
        }
      
        return (
          <ul>
            <button className='expButton' onClick={resetToRoot}>
                <img className='expIcon' alt='folderIcon' src={folderIcon} />
                tlroot
            </button>
            {renderChildren(node)}
          </ul>
        );
    };


    // TODO, create UI to view the children
    // TODO, handle clicking on files  
    // render the children of a node recursively, the real meat and potatoes
    const renderChildren = (node) => {
      if (!node || !node.children || node.children.length === 0) {
        return null;
      }

      return (
          <ul>
                {node.children
                  .filter(child => !child.name.includes('.')) // Filter out children with '.'
                  .map((child) => (
                      <li key={child.name}>
                            <button className='expButton' onClick={() => handleNodeClick(child.name)}>
                                <img className='expIcon' alt='folderIcon' src={folderIcon} />
                                {child.name}
                            </button>
                            {isNodeExpanded(child.name) && renderChildren(child)}
                      </li>
                  ))}
          </ul>
      );
  };

  const handleTimelineClick = (nodeName) => {

    alert("clicked " + nodeName)
    return

    let constructedPath = viewedNode.name + '.' + nodeName
    constructedPath = '/markdown/' + constructedPath
    navigate(constructedPath)
  }

  const handleAddFolder = () => {
    const newFolderName = prompt("Enter folder name:");
    if (newFolderName) {
        const newFolder = {
            name: newFolderName,
            children: []
        };

        //TODO add the folder to neo4j, if that fails, return with error!

        // Update the state to include the new folder as a child of the viewedNode
        setviewedNode(prevState => {
            const updatedNode = {
                ...prevState,
                children: [...prevState.children, newFolder]
            };

            // Update the data prop with the new child folder as well
            const updatedData = updateData(data, currentPath, updatedNode);
            setData(updatedData)
            return updatedNode;
        });
    }
  };

  const updateData = (data, currentPath, updatedNode) => {
    if (!currentPath || currentPath.length === 0) {
      // If currentPath is empty, update the root data directly
      return updatedNode;
    }
  
    let newData = { ...data };
    let currentNode = newData;
  
    for (let i = 0; i < currentPath.length; i++) {
      const nodeName = currentPath[i];
      const childNode = currentNode.children.find(child => child.name === nodeName);
  
      if (!childNode) {
        // If the current path does not exist in the data, return the original data
        return data;
      }
  
      if (i === currentPath.length - 1) {
        // If we've reached the last node in the current path, update its children
        const updatedChildren = currentNode.children.map(child => {
          if (child.name === nodeName) {
            return updatedNode;
          } else {
            return child;
          }
        });
        currentNode.children = updatedChildren;
      } else {
        // If not the last node, continue traversing the data structure
        currentNode = childNode;
      }
    }
  
    return newData;
  };

  const renderFolder = (node) => {
    if (!node) {
      return null;
    }
  
    return (
      <div className="tlfolder-container">
        <div className='pathline'>
            <button onClick={handleBackClick}>
                <img src={backArrow} alt='back arrow'/>
            </button>
            <button onClick={handleAddFolder}>
                <img src={purpFolderAdd} alt='add folder' />
            </button>
            {data.name}/{currentPath.join('/')}
        </div>
        <div className="tlgrid-container">
          {node.children && node.children.length > 0 && node.children.map((child) => (
            <div key={child.name} className="grid-item">
              {child.name.includes('.') ? (
                <button onClick={() => handleTimelineClick(child.name)}>
                  <img className='icon' src={blueFile} alt={child.name} />
                  <p className='item-name'>{child.name}</p>
                </button>
                ) : (
                  <button onClick={() => handleNodeClick(child.name)}>
                    <img className='icon' src={purpFolder} alt={child.name} />
                    <p className='item-name'>{child.name}</p>
                  </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
      
    // render the tree view, this is the main component that is exported
    return (
      <div>
          <div>
            <h2>Timeline Tree View</h2>
            <div className='explorerContainer'>
              
              <div className='fileTree'>
                {renderTree(data)}
              </div>
              <div className='tlfolder'>
                {renderFolder(viewedNode)}
              </div>
            </div>
            
            <div>Current Path: {currentPath.join(' > ')}</div>
            <button onClick={handleBackClick}>Back</button>
          </div>
          <div>
          Stack:
          <ul>
              {currentPath.map((item, index) => (
              <li key={index} >
                  {item}
              </li>
              ))}
          </ul>
          </div>
      </div>
    );
};