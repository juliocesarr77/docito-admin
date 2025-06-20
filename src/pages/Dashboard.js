// src/pages/Dashboard.js

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Mantido useNavigate, Link foi removido
import { useAuth } from '../context/AuthContext';
// Removendo 'query' e 'where' que não são mais usadas diretamente na busca simples
import { collection, onSnapshot } from 'firebase/firestore'; 
import { Book, ChefHat, Calculator, FilePlus, ListChecks, Calendar } from 'lucide-react';
// Removendo 'isThisWeek', 'isBefore', 'addDays' que não são usadas na lógica atual de "Pedidos da Semana"
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, db, logout } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoadingPedidos(false);
      return;
    }

    // Apenas busca a coleção, a filtragem e ordenação são feitas no frontend com useMemo
    const q = collection(db, 'pedidos'); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista);
      setLoadingPedidos(false);
    }, (error) => {
      console.error('Erro ao buscar pedidos:', error);
      setPedidos([]);
      setLoadingPedidos(false);
    });
    return () => unsubscribe();
  }, [db]);

  // Lógica para filtrar pedidos da semana
  const pedidosDaSemana = useMemo(() => {
    if (!pedidos.length) return [];

    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { locale: ptBR });
    const fimSemana = endOfWeek(hoje, { locale: ptBR });

    let filtered = pedidos.filter(pedido => {
      if (!pedido.dataEntrega || pedido.status === 'entregue') {
        return false;
      }
      try {
        const dataEntregaPedido = parseISO(pedido.dataEntrega);
        return dataEntregaPedido >= inicioSemana && dataEntregaPedido <= fimSemana;
      } catch (e) {
        console.error("Erro ao parsear dataEntrega:", pedido.dataEntrega, e);
        return false;
      }
    });

    // Opcional: ordenar os pedidos da semana por data de entrega (mais próximos primeiro)
    filtered.sort((a, b) => {
        const dateA = a.dataEntrega ? parseISO(a.dataEntrega) : new Date(8640000000000000); // Max Date para ir pro final
        const dateB = b.dataEntrega ? parseISO(b.dataEntrega) : new Date(8640000000000000); // Max Date para ir pro final
        return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [pedidos]);


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">Painel de Controle Docito</h1>
      <p className="admin-welcome-message">
        Bem-vindo(a), <strong>{currentUser?.displayName || currentUser?.email || 'Admin'}</strong>!
      </p>

      <div className="admin-nav-container">
        <button onClick={() => navigate('/novo-pedido')} className="admin-nav-button" style={{backgroundColor: '#D7BDE2', color: '#6A1B9A'}}>
            <FilePlus size={20}/>
            Novo Pedido
        </button>
        <button onClick={() => navigate('/pedidos')} className="admin-nav-button" style={{backgroundColor: '#82E0AA', color: '#145A32'}}>
            <ListChecks size={20}/>
            Listar Pedidos
        </button>
        <button onClick={() => navigate('/insumos')} className="admin-nav-button" style={{backgroundColor: '#FFDAB9', color: '#8B4513'}}><Book size={20}/> Gestão de Insumos</button>
        <button onClick={() => navigate('/receitas')} className="admin-nav-button" style={{backgroundColor: '#C1E1C1', color: '#2E8B57'}}><ChefHat size={20}/> Fichas Técnicas</button>
        <button onClick={() => navigate('/precificacao')} className="admin-nav-button" style={{backgroundColor: '#B0E0E6', color: '#4682B4'}}><Calculator size={20}/> Precificação Detalhada</button>
      </div>

      {/* NOVA SEÇÃO: Pedidos da Semana */}
      <div className="weekly-orders-section">
        <h2 className="weekly-orders-title"><Calendar size={20}/> Pedidos da Semana ({pedidosDaSemana.length})</h2>
        {loadingPedidos ? (
          <p>Carregando pedidos da semana...</p>
        ) : (
          pedidosDaSemana.length > 0 ? (
            <ul className="weekly-orders-list">
              {pedidosDaSemana.map(pedido => (
                <li key={pedido.id} className="weekly-order-item">
                  <p><strong>{pedido.nome}</strong></p>
                  <p>Produto: {pedido.produto}</p>
                  <p>Entrega: {pedido.dataEntrega ? format(parseISO(pedido.dataEntrega), 'EEEE, dd/MM', { locale: ptBR }) : 'N/A'} às {pedido.horaEntrega || 'N/A'}</p>
                  <p className={`status-${pedido.status?.toLowerCase().replace(/\s/g, '-')}`}>Status: {pedido.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum pedido agendado para esta semana. Que tal criar um novo?</p>
          )
        )}
      </div>

      <button onClick={handleLogout} className="admin-logout-button">
        Sair
      </button>
    </div>
  );
}

export default Dashboard;