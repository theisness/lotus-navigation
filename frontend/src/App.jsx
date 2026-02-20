import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Portal from './pages/Portal.jsx';
import './css/common.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/nav/:navId/*" element={<Portal />} />
      </Routes>
    </BrowserRouter>
  );
}
