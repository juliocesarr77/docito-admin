import React from 'react';
/*
 * =====================================================================================
 * !! VERIFICAÇÃO FINAL DE CAMINHO (LEIA COM ATENÇÃO) !!
 *
 * O erro "Could not resolve ../context/AuthContext" significa que o caminho para o seu
 * AuthContext está incorreto a partir deste arquivo.
 *
 * O seu PrivateRoute.js está na pasta 'src/components/'.
 * Precisamos dizer a ele exatamente onde encontrar o 'AuthContext.js'.
 *
 * O caminho '../context/AuthContext' tenta fazer o seguinte:
 * 1. Sair da pasta 'components/' (isso nos leva para a pasta 'src/').
 * 2. Entrar na pasta 'context/'.
 * 3. Encontrar o arquivo 'AuthContext.js'.
 *
 * AÇÃO: Por favor, verifique CUIDADOSAMENTE no seu Visual Studio Code:
 * 1. O nome da sua pasta é 'context' (tudo minúsculo)? Ou é 'Context'?
 * 2. O nome do seu arquivo é 'AuthContext.js' (com 'A' e 'C' maiúsculos)?
 *
 * A linha de importação abaixo usa o caminho que deveria ser o correto. Se ele falhar,
 * a causa mais provável é um erro de digitação (maiúscula/minúscula) no nome da
 * sua pasta ou arquivo. Se o erro continuar, por favor, me envie um print da sua
 * estrutura de pastas no Visual Studio Code para que eu possa ver os nomes exatos.
 * =====================================================================================
 */
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // Ou um componente de spinner
  }

  return currentUser ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
