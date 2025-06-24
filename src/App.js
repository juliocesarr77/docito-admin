// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute'; // PrivateRoute continua a proteger as rotas
import MainLayout from './layouts/MainLayout'; // Importa o novo MainLayout

// Importe todos os seus componentes de página aqui, eles serão renderizados dentro do MainLayout
import Dashboard from './pages/Dashboard';
import GerenciarInsumos from './pages/GerenciarInsumos';
import GerenciarReceitas from './pages/GerenciarReceitas';
import PrecificacaoDetalhada from './pages/PrecificacaoDetalhada';
import CadastroPedidoAdmin from './pages/CadastroPedidoAdmin';
import Pedidos from './pages/Pedidos';
import FluxoDeCaixa from './pages/FluxoDeCaixa';

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
          
          {/* Todas as rotas protegidas usarão o MainLayout */}
          <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/insumos" element={<GerenciarInsumos />} />
            <Route path="/receitas" element={<GerenciarReceitas />} /> 
            <Route path="/precificacao" element={<PrecificacaoDetalhada />} />
            <Route path="/novo-pedido" element={<CadastroPedidoAdmin />} />
            <Route path="/editar-pedido/:id" element={<CadastroPedidoAdmin />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/fluxo-de-caixa" element={<FluxoDeCaixa />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
