import React, {useEffect, useState} from 'react';
import '../styles/TimelineTreeView.css';
import purpFolder from '../assets/purpFolder.png';
import purpFolderAdd from '../assets/purpFolderAdd.png'
import purpFileAdd from '../assets/purpFileAdd.png'
import blueFile from '../assets/blueFile.png';
import backArrow from '../assets/replyArrow.png'
import folderIcon from '../assets/folderIcon.png'
import trashCan from '../assets/trash.png'
import { useNavigate } from 'react-router-dom';

export default function TimelineTreeView({originalData}) {

    // stack that tracks the current path through file tree
    // starts with the root folder implied 
    // IMPORTANT!!!! EMPTY ARRAY IS THE ROOT FOLDER
    const [currentPath, setCurrentPath] = useState([]);

    // set that tracks which nodes are expanded currently
    const [expandedNodes, setExpandedNodes] = useState(new Set([originalData.name]));

    // node that is currently beign shown by the folder viewer
    const [viewedNode, setviewedNode] = useState();

    // used for updating file structure on add/removes
    const [data, setData] = useState();

    // used to link to other pages on the site
    const navigate = useNavigate();

    // initial setup required otherwise weird timing issues?
    useEffect(() => {
      
      setviewedNode(originalData);
      setData(originalData)
      
    }, [originalData]);

    // ==============================================================
    //                  HANDLERS FOR BUTTONS
    //                 THAT DONT MODIFY STATE
    // ==============================================================

    // when a node is clicked, add it to the current path and expand it
    const handleNodeClick = (nodeName) => {     
        // Check if the clicked node is a direct child of the current node
        let clickedNode;
        if (viewedNode.children) {
          clickedNode = viewedNode.children.find(child => child.name === nodeName);
        }
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

    const resetToRoot = () => {
      setCurrentPath([]);
      setExpandedNodes(new Set([data.name]));
      setviewedNode(data);
    }

    const handleTimelineClick = (nodeName) => {

      alert("clicked " + nodeName)
      return
  
      //TODO create timeline viewing page
  
      let constructedPath = viewedNode.name + '.' + nodeName
      constructedPath = '/markdown/' + constructedPath
      navigate(constructedPath)
    }

    // ==============================================================
    //                  HANDLERS FOR BUTTONS
    //               THAT ***DO*** MODIFY STATE
    // ==============================================================

    const handleAddTimeline = () => {
      let newTimelineName = prompt("Enter timeline name:");
  
      if (newTimelineName) {
  
        if (!newTimelineName.endsWith('.tl')) {
          newTimelineName += '.tl'
        }
  
        const newTimeline = {
            name: newTimelineName,
            children: []
        };
  
        // TODO: update neo4j with a new timeline
  
        // Update the state to include the new folder as a child of the viewedNode
        setviewedNode(prevState => {
            const updatedNode = {
                ...prevState,
                children: [...prevState.children, newTimeline]
            };
  
            // Update the data prop with the new child folder as well
            const updatedData = updateData(data, currentPath, updatedNode);
            setData(updatedData)
            return updatedNode;
        });
    }
    }
  
    const handleAddFolder = () => {
      const newFolderName = prompt("Enter folder name:");
      if (newFolderName) {
          const newFolder = {
              name: newFolderName,
              children: []
          };
  
          // add the folder to neo4j, if that fails, return with error!
          const newFolderURL = `http://localhost:8080/api/create/TimelineFolder/${viewedNode.name}/${newFolderName}`
          fetch(newFolderURL, {
            method: 'POST'
          }).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
          }).catch(error => {
            console.error('Removal Error: , error')
          })
          
  
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
  
    const handleRemoveObject = (objectNameToRemove) => {
  
      const confirmed = window.confirm('Are you sure you want to delete ' + objectNameToRemove + '?')
      if(!confirmed) return;
      
      if (objectNameToRemove) {
        // Check if the object exists in the current node's children
        const objectToRemove = viewedNode.children.find(child => child.name === objectNameToRemove);
        if (objectToRemove.children && (objectToRemove.children.length > 0)) {
          alert("cant delete folder with contents")
          return
        }
        if (objectToRemove) {
  
          // update neo4j, if it fails, return
          const removeFolderURL = `http://localhost:8080/api/delete/TimelineFolder/${viewedNode.name}/${objectNameToRemove}`
          fetch(removeFolderURL, {
            method: 'POST'
          }).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
          }).catch(error => {
            console.error('Removal Error: , error')
          })
  
          // Remove the object from the data structure
          const updatedData = removeData(data, currentPath, objectNameToRemove);
          setData(updatedData);
          
          // Update the state to reflect the removed object
          setviewedNode(prevState => {
            const updatedNode = {
              ...prevState,
              children: prevState.children.filter(child => child.name !== objectNameToRemove)
            };
            return updatedNode;
          });
        } else {
          alert(`Object "${objectNameToRemove}" not found.`);
        }
      }
    };
    
    // helper function that modifies data accordingly
    const removeData = (data, currentPath, nodeNameToRemove) => {
    
      let newData = { ...data };
      let currentNode = newData;
    
      for (let i = 0; i < currentPath.length; i++) {
        const nodeName = currentPath[i];
        const childNode = currentNode.children.find(child => child.name === nodeName);
    
        if (!childNode) {
          // If the current path does not exist in the data, return the original data
          return data;
        }
        
        currentNode = childNode;
      }
  
      const updatedChildren = currentNode.children.filter(child => child.name !== nodeNameToRemove);
      currentNode.children = updatedChildren;
    
      return newData;
    };
  
    // helper function that modifies data accordingly
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

    // ==============================================================
    //                      UTILITY FUNCTIONS
    // ==============================================================

    // check if a node is expanded
    // TODO, if file has same name later in hierarrchy, this breaks
    const isNodeExpanded = (nodeName) => {
      return expandedNodes.has(nodeName);
    };

    // ==============================================================
    //                      RENDERING FUNCTIONS
    // ==============================================================

    // render the tree recursively, this is the kickstarter, deals with root case
    const renderTree = (node) => {
        if (!node) {
          return null;
        }
      
        return (
          <ul>
            <button className='tlexpButton' onClick={resetToRoot}>
                <img className='tlexpIcon' alt='folderIcon' src={folderIcon} />
                tlroot
            </button>
            {renderChildren(node)}
          </ul>
        );
    };

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
                            <button className='tlexpButton' onClick={() => handleNodeClick(child.name)}>
                                <img className='tlexpIcon' alt='folderIcon' src={folderIcon} />
                                {child.name}
                            </button>
                            {isNodeExpanded(child.name) && renderChildren(child)}
                      </li>
                  ))}
          </ul>
      );
  };

  // render a view of the contents of the currently viewed folder
  const renderFolder = (node) => {
    if (!node) {
      return null;
    }
  
    return (
      <div className="tlfolder-container">
        <div className='tlpathline'>
            <button onClick={handleBackClick}>
                <img src={backArrow} alt='back arrow'/>
            </button>
            <button onClick={handleAddFolder}>
                <img src={purpFolderAdd} alt='add folder' />
            </button>
            <button onClick={handleAddTimeline}> 
              <img src={purpFileAdd} alt='add file' />
            </button>
            {data.name}/{currentPath.join('/')}
        </div>
        <div className="tlgrid-container">
          {node.children && node.children.length > 0 && node.children.map((child) => (
            <div key={child.name} className="tlgrid-item">
              <button className='tldelete-button' onClick={() => handleRemoveObject(child.name)}>
                <img src={trashCan} alt='delete'/>
              </button>
              {child.name.includes('.') ? (
                <button className='tlgrid-button' onClick={() => handleTimelineClick(child.name)}>
                  <img className='tlicon' src={blueFile} alt={child.name} />
                  <p className='tlitem-name'>{child.name}</p>
                </button>
                ) : (
                  <button className='tlgrid-button' onClick={() => handleNodeClick(child.name)}>
                    <img className='tlicon' src={purpFolder} alt={child.name} />
                    <p className='tlitem-name'>{child.name}</p>
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
          <div className='tlexplorerContainer'>
            
            <div className='tlfileTree'>
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