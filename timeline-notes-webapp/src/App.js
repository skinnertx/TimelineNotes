
import './styles/App.css';
import Root from './routes/root';
import ErrorPage from './error-page';
import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar';
import Hierarchy from './routes/hierarchy';
import MicromarkFile from './routes/markdownFile';
import TimelineHierarchy from './routes/timelineHierarchy';
import TimelineViewer from './routes/timeline';
import GenericErrorPage from './errors/genericError';

function App() {
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
          path='/error'
          element={<GenericErrorPage/>}
        />
      </Routes>
    </div>
    </>
  );
}

export default App;
