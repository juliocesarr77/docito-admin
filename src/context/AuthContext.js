import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
/*
 * =====================================================================================
 * !! VERIFICAÇÃO FINAL DE CAMINHO (LEIA COM ATENÇÃO) !!
 *
 * O erro "Could not resolve ../firebase/config" significa que o caminho para o seu
 * arquivo de configuração do Firebase está INCORRETO a partir deste arquivo.
 * O seu AuthContext.js está na pasta 'src/context/'.
 * Precisamos dizer a ele exatamente onde encontrar o 'config.js'.
 *
 * O caminho '../firebase/config' tenta fazer o seguinte:
 * 1. Sair da pasta 'context/' (isso nos leva para a pasta 'src/').
 * 2. Entrar na pasta 'firebase/'.
 * 3. Encontrar o arquivo 'config.js'.
 *
 * AÇÃO: Por favor, verifique CUIDADOSAMENTE no seu Visual Studio Code:
 * 1. O nome da sua pasta é 'firebase' (tudo minúsculo)? Ou é 'Firebase'?
 * 2. O nome do seu arquivo de configuração é 'config.js' (tudo minúsculo)?
 *
 * A linha de importação abaixo usa o caminho que deveria ser o correto. Se ele falhar,
 * a causa mais provável é um erro de digitação (maiúscula/minúscula) no nome da
 * sua pasta ou arquivo. Se o erro continuar, por favor, me envie um print da sua
 * estrutura de pastas no Visual Studio Code para que eu possa ver os nomes exatos.
 * =====================================================================================
 */
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    db // Distribuindo a conexão do banco de dados para todo o app
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
