import React, {useEffect, useState} from 'react';
import '../styles/TreeView.css';
import purpFolder from '../assets/purpFolder.png';
import blueFile from '../assets/blueFile.png';
import folderIcon from '../assets/folderIcon.png'
import backArrow from '../assets/replyArrow.png'
import purpFolderAdd from '../assets/purpFolderAdd.png'
import purpFileAdd from '../assets/purpFileAdd.png'
import { useNavigate } from 'react-router-dom';
import trashCan from '../assets/trash.png'
import config from '../config';


/* 
  I'm aware how silly it is to have the TreeView and TimelineTreeView js objects
  and how unmaintainable given how similar they are, but there are slight differences
  and i developed them at different times so this is how it will be

  Maybe future me will comeback and merge these monstrosities but not now
*/


export default function TreeView({originalData}) {

    // stack that tracks the current path through file tree
    // starts with the root folder implied 
    // IMPORTANT!!!! EMPTY ARRAY IS THE ROOT FOLDER
    const [currentPath, setCurrentPath] = useState([]);
    // set that tracks which nodes are expanded currently
    const [expandedNodes, setExpandedNodes] = useState(new Set([originalData.name]));

    const [viewedNode, setviewedNode] = useState();

    const [data, setData] = useState();

    // const [filePath, setFilePath] = useState('')

    const navigate = useNavigate();

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

    
    const resetToRoot = () => {
      setCurrentPath([]);
      setExpandedNodes(new Set([data.name]));
      setviewedNode(data);
    }

    const handleFileClick = (nodeName) => {
      let constructedPath = viewedNode.name + '/' + nodeName
      constructedPath = '/markdown/' + constructedPath
      navigate(constructedPath)
    }

    // ==============================================================
    //                  HANDLERS FOR BUTTONS
    //               THAT ***DO*** MODIFY STATE
    // ==============================================================

    const handleAddMarkdownFile = async () => {

      // get file name
      let newFileName = prompt("Enter file name:");
      let fileWithEnd;
      if (newFileName) {
        if (!newFileName.includes(".md")) {
          fileWithEnd = newFileName + ".md"
        }
      } else {
        return
      }

      // try to upload to db and s3
      try {

          const title = newFileName + "\n==================="
          const blob = new Blob([title], { type: 'text/plain' });

          const formData = new FormData();
          formData.append('file', blob, fileWithEnd);

          const uploadURL = config.backendBaseUrl + `create/MarkdownFile/${viewedNode.name}`

          const jwtToken = localStorage.getItem('token')

          const headers = new Headers()
          headers.append('Authorization', `Bearer ${jwtToken}`)

          const response = await fetch(uploadURL, {
              method: 'POST',
              headers: headers,
              body: formData,
          });

          if (!response.ok) {
              if(response.status === 401) {
                alert("admin only, please login")
              }
              throw new Error(`Failed to save Markdown file (status ${response.status})`);
          }

          const newFile = {
            name: fileWithEnd,
            children: []
          };
    
          // Update the state to include the new file as a child of the viewedNode
          setviewedNode(prevState => {
            let newChildren = []
            if (prevState && prevState.children) {
              newChildren = [...prevState.children, newFile]
            } else {
              newChildren = [newFile]
            }
    
            const updatedNode = {
              name: viewedNode.name,
              children: [...newChildren]
            }
    
            // Update the data prop with the new child folder as well
            const updatedData = updateData(data, currentPath, updatedNode);
            setData(updatedData)
            return updatedNode;
          });

          console.log('Markdown file saved successfully!');
      } catch (error) {
          console.error('Error saving Markdown file:', error.message);
          return
      }


  };

    // handle add folder
    const handleAddFolder = () => {
      const newFolderName = prompt("Enter folder name:");
      if (newFolderName) {
          const newFolder = {
              name: newFolderName,
              children: []
          };
  
          // add the folder to neo4j, if that fails, return with error!
          const newFolderURL = config.backendBaseUrl + `create/Folder/${viewedNode.name}/${newFolderName}`
          
          const jwtToken = localStorage.getItem('token')

          const headers = new Headers()
          headers.append('Authorization', `Bearer ${jwtToken}`)

          fetch(newFolderURL, {
            method: 'POST',
            headers:headers,
          }).then(response => {
            if (!response.ok) {
              if(response.status === 401) {
                alert("admin only, please login")
              }
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

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
          }).catch(error => {
            console.error('Removal Error: , error')
          })
          
  
          
      }
    };


    // handle remove object
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
            const removeFolderURL = config.backendBaseUrl + `delete/Folder/${viewedNode.name}/${objectNameToRemove}`
            
            const jwtToken = localStorage.getItem('token')

            const headers = new Headers()
            headers.append('Authorization', `Bearer ${jwtToken}`)
            
            fetch(removeFolderURL, {
              method: 'POST',
              headers:headers
            }).then(response => {
              if (!response.ok) {
                if(response.status === 401) {
                  alert("admin only, please login")
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
                
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
            }).catch(error => {
              console.error('Removal Error: , error')
            })

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
            <button className='expButton' onClick={resetToRoot}>
              <img className='expIcon' alt='folderIcon' src={folderIcon} />
              root
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



  const renderFolder = (node) => {
    if (!node) {
      return null;
    }
  
    return (
      <div className="folder-container">
        <div className='pathline'>
            <button onClick={handleBackClick}>
                <img src={backArrow} alt='back arrow'/>
            </button>
            <button onClick={handleAddFolder}>
                <img src={purpFolderAdd} alt='add folder' />
            </button>
            <button onClick={handleAddMarkdownFile}> 
              <img src={purpFileAdd} alt='add file' />
            </button>
            {data.name}/{currentPath.join('/')}
        </div>
        <div className="grid-container">
          {node.children && node.children.length > 0 && node.children.map((child) => (
            <div key={child.name} className="grid-item">
              <button className='delete-button' onClick={() => handleRemoveObject(child.name)}>
                <img src={trashCan} alt='delete'/>
              </button>
              {child.name.includes('.') ? (
                <button className='grid-button' onClick={() => handleFileClick(child.name)}>
                  <img className='icon' src={blueFile} alt={child.name} />
                  <p className='item-name'>{child.name}</p>
                </button>
                ) : (
                  <button className='grid-button' onClick={() => handleNodeClick(child.name)}>
                    <div className='button-content'>
                      <img className='icon' src={purpFolder} alt={child.name} />
                      <p className='item-name'>{child.name}</p>
                    </div>
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
            <h2 className='folder-tree-header'>Folder Tree View</h2>
            <div className='explorerContainer'>
              
              <div className='fileTree'>
                {renderTree(data)}
              </div>
              <div className='folder'>
                {renderFolder(viewedNode)}
              </div>
            </div>
          </div>
          
      </div>
    );
};