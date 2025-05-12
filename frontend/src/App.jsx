import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './pages/Menu';
import Login from './pages/admin/Login';
import Admin from './pages/admin/Main';
import QR from './pages/QR';
import Table from './pages/Table';
import Dish from './pages/Dish';
import Order from './pages/Order';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/qr" element={<QR />} />
        <Route path="/table" element={<Table />} />
        <Route path="/Dish" element={<Dish />} />
        <Route path="/order/:id" element={<Order />} />
      </Routes>
    </Router>
  );
}

export default App;
