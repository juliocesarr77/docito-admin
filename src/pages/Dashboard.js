// src/pages/Dashboard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';

/*
 * =====================================================================================
 * !! VERIFICAÇÃO FINAL DE CAMINHO (LEIA COM ATENÇÃO) !!
 *
 * O erro "Could not resolve ../context/AuthContext" significa que o caminho para o seu
 * AuthContext está incorreto a partir deste arquivo.
 *
 * O seu Dashboard.js está na pasta 'src/pages/'.
 * Precisamos dizer a ele exatamente onde encontrar o 'AuthContext.js'.
 *
 * O caminho '../context/AuthContext' tenta fazer o seguinte:
 * 1. Sair da pasta 'pages/' (isso nos leva para a pasta 'src/').
 * 2. Entrar na pasta 'context/'.
 * 3. Encontrar o arquivo 'AuthContext.js'.
 *
 * => AÇÃO: SE O ERRO CONTINUAR, POR FAVOR, VERIFIQUE NO SEU VISUAL STUDIO CODE:
 * 1. O nome da sua pasta é EXATAMENTE 'context' (tudo minúsculo)? Ou é 'Context'?
 * 2. O nome do seu arquivo é EXATAMENTE 'AuthContext.js' (com 'A' e 'C' maiúsculos)?
 * 3. Este arquivo, 'Dashboard.js', está realmente dentro de uma pasta 'pages'?
 *
 * A linha de importação abaixo usa o caminho que deveria ser o correto. Se ele falhar,
 * a causa mais provável é um erro de digitação (maiúscula/minúscula) no nome da
 * sua pasta ou arquivo.
 * =====================================================================================
 */
import { useAuth } from '../context/AuthContext';
import { Book, ChefHat, Calculator } from 'lucide-react';

function Dashboard() {
  const { currentUser, auth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login'); 
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Estilos para deixar o painel mais agradável
  const styles = {
    container: {
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#fffaf5',
      minHeight: '100vh',
      textAlign: 'center'
    },
    title: {
      color: '#5a2a0c',
      marginBottom: '1rem',
    },
    welcomeMessage: {
      color: '#333',
      marginBottom: '3rem'
    },
    navContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
      marginBottom: '3rem'
    },
    navButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#ffe0b2',
      color: '#bf360c',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    logoutButton: {
      padding: '10px 25px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#ff6b6b',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginTop: '2rem'
    }
  };

  // Efeito de hover para o botão de navegação
  const handleMouseOver = (e) => {
    e.currentTarget.style.backgroundColor = '#ffc966';
    e.currentTarget.style.transform = 'translateY(-2px)';
  };

  const handleMouseOut = (e) => {
    e.currentTarget.style.backgroundColor = '#ffe0b2';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Painel de Controle Docito</h1>
      <p style={styles.welcomeMessage}>
        Bem-vindo(a), <strong>{currentUser?.email || 'Admin'}</strong>!
      </p>

      <div style={styles.navContainer}>
        <button 
          onClick={() => navigate('/insumos')} 
          style={styles.navButton}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
            <Book size={20}/>
            Gestão de Insumos
        </button>
        
        <button 
          onClick={() => navigate('/receitas')} 
          style={styles.navButton}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
            <ChefHat size={20}/>
            Fichas Técnicas
        </button>
        
        <button 
          onClick={() => navigate('/precificacao')} 
          style={styles.navButton}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
            <Calculator size={20}/>
            Precificação Detalhada
        </button>
      </div>

      <button 
        onClick={handleLogout}
        style={styles.logoutButton}
      >
        Sair
      </button>
    </div>
  );
}

export default Dashboard;
