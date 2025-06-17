// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

/*
 * =====================================================================================
 * !! VERIFICAÇÃO FINAL DE CAMINHO (LEIA COM ATENÇÃO) !!
 *
 * O erro "Could not resolve" significa que a estrutura das suas pastas não
 * corresponde ao que o código espera.
 *
 * A ESTRUTURA DE PASTAS CORRETA DEVE SER ASSIM:
 * src/
 * ├── components/
 * │   └── PrivateRoute.js
 * ├── context/
 * │   └── AuthContext.js
 * ├── firebase/
 * │   └── config.js
 * ├── pages/
 * │   ├── Dashboard.js
 * │   ├── GerenciarInsumos.js
 * │   ├── GerenciarReceitas.js
 * │   ├── Login.js
 * │   └── PrecificacaoDetalhada.js
 * └── App.js (Este arquivo)
 *
 * => AÇÃO: SE O ERRO CONTINUAR, POR FAVOR, VERIFIQUE NO SEU VISUAL STUDIO CODE:
 * 1. O seu arquivo App.js está diretamente dentro da pasta 'src'?
 * 2. As pastas 'components', 'context' e 'pages' estão diretamente dentro da pasta 'src'?
 * 3. Os nomes das pastas e dos arquivos estão EXATAMENTE iguais (maiúsculas/minúsculas)?
 *
 * As importações abaixo estão corretas para a estrutura acima.
 * =====================================================================================
 */
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import GerenciarInsumos from './pages/GerenciarInsumos';
import GerenciarReceitas from './pages/GerenciarReceitas';
import PrecificacaoDetalhada from './pages/PrecificacaoDetalhada';

// Componente para redirecionar o usuário da página inicial
function HomeRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }
  // Se o usuário estiver logado, redireciona para o dashboard.
  // Se não, redireciona para a página de login.
  return currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rota de Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Rota do Dashboard (Protegida) */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          
          {/* Rota para Gestão de Insumos (Protegida) */}
          <Route 
            path="/insumos" 
            element={
              <PrivateRoute>
                <GerenciarInsumos />
              </PrivateRoute>
            } 
          />

          {/* Rota para Gestão de Receitas (Protegida) */}
          <Route 
            path="/receitas" 
            element={
              <PrivateRoute>
                <GerenciarReceitas />
              </PrivateRoute>
            } 
          />
          
          {/* Nova Rota para a Precificação Detalhada (Protegida) */}
          <Route 
            path="/precificacao" 
            element={
              <PrivateRoute>
                <PrecificacaoDetalhada />
              </PrivateRoute>
            } 
          />

          {/* Rota Inicial que faz o redirecionamento automático */}
          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Removi a rota para a calculadora antiga para simplificar
// e evitar confusão. Se precisar dela de volta, é só adicionar.

export default App;
