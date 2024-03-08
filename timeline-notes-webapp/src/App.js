
import './styles/App.css';
import Root from './routes/root';
import ErrorPage from './error-page';
import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar';
import Hierarchy from './routes/hierarchy';
import MicromarkFile from './routes/markdownFile';
import TimelineHierarchy from './routes/timelineHierarchy';
import TimelineViewer from './routes/timelineViewer';
import LoginPage from './routes/login';
import GenericErrorPage from './errors/genericError';
import React, {useEffect} from 'react';


function App() {

  useEffect(() => {
    const clearLocalStorage = () => {
      console.log("unloadin")
      localStorage.clear();
    };

    window.addEventListener('beforeunload', clearLocalStorage);

    return () => {
      window.removeEventListener('beforeunload', clearLocalStorage);
    };
  }, []);

  return (
    <>
    <Navbar />
    <div>
      <Routes>
        <Route 
          path="/" 
          element={<Root />} 
          errorElement={<ErrorPage/>}
        />
        <Route 
          path="/markdown/:parent/:file" 
          element={<MicromarkFile />} 
          errorElement={<ErrorPage/>}
        />
        <Route 
          path="/timeline/:timeline" 
          element={<TimelineViewer />} 
          errorElement={<ErrorPage/>}
        />
        <Route
          path="/hierarchy"
          element={<Hierarchy />}
          errorElement={<ErrorPage/>} 
        />
        <Route
          path="/timeline-hierarchy"
          element={<TimelineHierarchy />}
          errorElement={<ErrorPage/>}
        />
        <Route 
          path='/login'
          element={<LoginPage />}
          errorElement={<ErrorPage />}
        />
        <Route
          path='/error'
          element={<GenericErrorPage/>}
        />
      </Routes>
    </div>
    </>
  );
}

export default App;
