// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import GerenciarInsumos from './pages/GerenciarInsumos';
import GerenciarReceitas from './pages/GerenciarReceitas';
import PrecificacaoDetalhada from './pages/PrecificacaoDetalhada';
import CadastroPedidoAdmin from './pages/CadastroPedidoAdmin';
import Pedidos from './pages/Pedidos'; // 1. Importa a nova página

function HomeRedirect() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <div>Carregando...</div>;
  }
  return currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/insumos" element={<PrivateRoute><GerenciarInsumos /></PrivateRoute>} />
          <Route path="/receitas" element={<PrivateRoute><GerenciarReceitas /></PrivateRoute>} />
          <Route path="/precificacao" element={<PrivateRoute><PrecificacaoDetalhada /></PrivateRoute>} />
          <Route path="/novo-pedido" element={<PrivateRoute><CadastroPedidoAdmin /></PrivateRoute>} />
          <Route path="/editar-pedido/:id" element={<PrivateRoute><CadastroPedidoAdmin /></PrivateRoute>} />
          
          {/* 2. Adiciona a nova rota para a lista de pedidos */}
          <Route path="/pedidos" element={<PrivateRoute><Pedidos /></PrivateRoute>} />

          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;