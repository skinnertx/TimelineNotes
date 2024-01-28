
import './styles/App.css';
import Root from './routes/root';
import ErrorPage from './error-page';
import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar';
import Hierarchy from './routes/hierarchy';
import MicromarkFile from './routes/markdownFile';

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
          path="/markdown/:file" 
          element={<MicromarkFile />} 
          errorElement={<ErrorPage/>}
        />
        <Route
          path="/hierarchy"
          element={<Hierarchy />}
          errorElement={<ErrorPage/>} 
        />
      </Routes>
    </div>
    </>
  );
}

export default App;
