import React, { useState } from 'react';
/*
 * =====================================================================================
 * !! VERIFICAÇÃO FINAL DE CAMINHO (LEIA COM ATENÇÃO) !!
 *
 * O erro "Could not resolve ../firebase/config" significa que o caminho para o seu
 * arquivo de configuração do Firebase está INCORRETO a partir deste arquivo.
 * O seu Login.js está na pasta 'src/pages/'.
 * Precisamos dizer a ele exatamente onde encontrar o 'config.js'.
 *
 * O caminho '../firebase/config' tenta fazer o seguinte:
 * 1. Sair da pasta 'pages/' (isso nos leva para a pasta 'src/').
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
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Use as credenciais do seu usuário administrador
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard'); // Redireciona para o dashboard após o login
    } catch (err) {
      setError('Falha ao fazer login. Verifique seu e-mail e senha.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Estilos inline para simplicidade no novo projeto
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#fffaf5',
      fontFamily: 'Arial, sans-serif'
    },
    card: {
      padding: '40px',
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      width: '350px'
    },
    title: {
      color: '#5a2a0c',
      marginBottom: '2rem'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    input: {
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '1rem'
    },
    button: {
      padding: '12px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#ffb347',
      color: '#5a2a0c',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    error: {
      color: 'red',
      marginTop: '1rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Admin - Docito Gestão</h2>
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail do Administrador"
            required
            disabled={loading}
          />
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            disabled={loading}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
