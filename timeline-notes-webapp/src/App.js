
import './App.css';
import MarkdownViewer from './components/Markdown';
import Root from './routes/root';
import ErrorPage from './error-page';
import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar';

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
          element={<MarkdownViewer />} 
          errorElement={<ErrorPage/>}
        />
      </Routes>
    </div>
    </>
  );
}

export default App;
