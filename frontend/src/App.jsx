import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './pages/Menu';
import Login from './pages/admin/Login';
import Admin from './pages/admin/Main';
import Table from './pages/Table';
import Cart from './pages/Cart';
import Order from './pages/Order';
import Orders from './pages/Order';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/table" element={<Table />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order/:id" element={<Order />} />
        <Route path="/order/" element={<Order />} />
        <Route path="/orders/" element={<Orders />} />
      </Routes>
    </Router>
  );
}

export default App;
