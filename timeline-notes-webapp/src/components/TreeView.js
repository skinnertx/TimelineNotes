import React, {useEffect, useState} from 'react';
import '../styles/TreeView.css';
import purpFolder from '../assets/purpFolder.png';
import blueFile from '../assets/blueFile.png';

export default function TreeView({data}) {

    // stack that tracks the current path through file tree
    // starts with the root folder implied 
    // IMPORTANT!!!! EMPTY ARRAY IS THE ROOT FOLDER
    const [currentPath, setCurrentPath] = useState([]);
    // set that tracks which nodes are expanded currently
    const [expandedNodes, setExpandedNodes] = useState(new Set([data.name]));

    const [viewedNode, setviewedNode] = useState();

    useEffect(() => {
      setviewedNode(data);
    }, [data]);

    // when a node is clicked, add it to the current path and expand it
    const handleNodeClick = (nodeName) => {      

        // Check if the clicked node is a direct child of the current node
        // TODO, if it is not, try checking upper levels to find it?
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
            <button onClick={resetToRoot}>root</button>
            {renderChildren(node)}
          </ul>
        );
    };


    // TODO, create UI to view the children
    // TODO, handle clicking on files  
    // render the children of a node recursively, the real meat and potatoes
    const renderChildren = (node) => {
      return (
          <ul>
              {node.children
                  .filter(child => !child.name.includes('.')) // Filter out children with '.'
                  .map((child) => (
                      <li key={child.name}>
                          <button onClick={() => handleNodeClick(child.name)}>{child.name}</button>
                          {isNodeExpanded(child.name) && renderChildren(child)}
                      </li>
                  ))}
          </ul>
      );
  };

  const renderFolder = (node) => {
    if (!node || !node.children || node.children.length === 0) {
      return null;
    }
  
    return (
      <div className="folder-container">
        <div>root/{currentPath.join('/')}</div>
        <div className="grid-container">
          {node.children.map((child) => (
            <div key={child.name} className="grid-item">
              <button onClick={() => handleNodeClick(child.name)}>
                {child.name.includes('.') ? (
                  <img className='icon' src={blueFile} alt={child.name} />
                ) : (
                  <img className='icon' src={purpFolder} alt={child.name} />
                )}
                <p className='item-name'>{child.name}</p>

              </button>
              
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
            <h2>Tree View</h2>
            <div className='explorerContainer'>
              
              <div className='fileTree'>
                {renderTree(data)}
              </div>
              <div className='folder'>
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