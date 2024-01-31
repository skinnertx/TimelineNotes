import React, {useEffect, useState} from 'react';
import '../styles/TreeView.css';

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
    const isNodeExpanded = (nodeName) => {
        return expandedNodes.has(nodeName);
    };

    // render the tree recursively, this is the kickstarter, deals with root case
    const renderTree = (node) => {
        if (!node || !node.children || node.children.length === 0) {
          return null;
        }
      
        return (
          <ul>
            {node.name}
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
                {node.children.map((child) => (
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
        <ul>
          <div>root/{currentPath.join('/')}</div>
          {renderChildren(node)}
        </ul>
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