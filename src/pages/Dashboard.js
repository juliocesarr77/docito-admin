// src/pages/Dashboard.js

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore'; 
// CORREÇÃO: Adicionado PackageCheck e Clock à importação de lucide-react
import { Book, ChefHat, FilePlus, ListChecks, Calendar, DollarSign, TrendingUp, TrendingDown, Info, Wallet, PackageCheck, Clock } from 'lucide-react'; 
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, db, logout } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [transacoesFluxo, setTransacoesFluxo] = useState([]); // NOVO: Estado para transações do fluxo de caixa
  const [loadingData, setLoadingData] = useState(true); // Controla carregamento geral

  useEffect(() => {
    if (!db) {
      setLoadingData(false);
      return;
    }

    // Listener para Pedidos
    const unsubscribePedidos = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista);
      // Pode ser ajustado se o fluxo de caixa carregar mais lentamente, ou usar Promise.all
      // setLoadingData(false); 
    }, (error) => {
      console.error('Erro ao buscar pedidos:', error);
      setPedidos([]);
      setLoadingData(false);
    });

    // NOVO: Listener para Transações do Fluxo de Caixa
    const unsubscribeFluxo = onSnapshot(collection(db, 'fluxoDeCaixa'), (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTransacoesFluxo(lista);
        // Agora, podemos definir loadingData para false aqui, ou coordenar melhor
        setLoadingData(false); 
    }, (error) => {
        console.error('Erro ao buscar transações do fluxo de caixa:', error);
        setTransacoesFluxo([]);
        setLoadingData(false);
    });

    return () => {
        unsubscribePedidos();
        unsubscribeFluxo(); // Limpar listener do fluxo de caixa
    };
  }, [db]);

  // NOVO: Métricas Calculadas com useMemo
  const dashboardMetrics = useMemo(() => {
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);

    // Métricas de Pedidos
    const totalPedidosAtivos = pedidos.filter(p => p.status !== 'entregue').length;
    const pedidosEntreguesMes = pedidos.filter(p => {
        if (p.status !== 'entregue' || !p.dataPagamento) return false;
        // Garante que p.dataPagamento é um objeto Timestamp antes de chamar toDate()
        const dataPagamento = p.dataPagamento.toDate ? p.dataPagamento.toDate() : new Date(p.dataPagamento); 
        return dataPagamento >= inicioMes && dataPagamento <= fimMes;
    }).length;

    const pedidosPorStatus = {
        pendente: pedidos.filter(p => p.status === 'pendente').length,
        emProducao: pedidos.filter(p => p.status === 'em produção').length,
        pronto: pedidos.filter(p => p.status === 'pronto').length,
        entregue: pedidos.filter(p => p.status === 'entregue').length,
        total: pedidos.length
    };

    // Métricas Financeiras
    const saldoGeralCaixa = transacoesFluxo.reduce((acc, transacao) => {
        if (transacao.tipo === 'receita') return acc + (transacao.valor || 0);
        if (transacao.tipo === 'saida') return acc - (transacao.valor || 0);
        return acc;
    }, 0);

    const receitasMesAtual = transacoesFluxo.filter(t => {
        if (t.tipo !== 'receita' || !t.data) return false;
        const dataTransacao = t.data.toDate ? t.data.toDate() : new Date(t.data);
        return dataTransacao >= inicioMes && dataTransacao <= fimMes;
    }).reduce((sum, t) => sum + (t.valor || 0), 0);

    const despesasMesAtual = transacoesFluxo.filter(t => {
        if (t.tipo !== 'saida' || !t.data) return false;
        const dataTransacao = t.data.toDate ? t.data.toDate() : new Date(t.data);
        return dataTransacao >= inicioMes && dataTransacao <= fimMes;
    }).reduce((sum, t) => sum + (t.valor || 0), 0);
    
    const balancoMesAtual = receitasMesAtual - despesasMesAtual;

    return {
      totalPedidosAtivos,
      pedidosEntreguesMes,
      pedidosPorStatus,
      saldoGeralCaixa,
      receitasMesAtual,
      despesasMesAtual,
      balancoMesAtual
    };
  }, [pedidos, transacoesFluxo]);


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

    filtered.sort((a, b) => {
        const dateA = a.dataEntrega ? parseISO(a.dataEntrega) : new Date(8640000000000000); 
        const dateB = b.dataEntrega ? parseISO(b.dataEntrega) : new Date(8640000000000000); 
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

  if (loadingData) {
    return <div className="loading-container">Carregando Painel de Controle...</div>;
  }

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">Painel de Controle Docito</h1>
      <p className="admin-welcome-message">
        Bem-vindo(a), <strong>{currentUser?.displayName || currentUser?.email || 'Admin'}</strong>!
      </p>

      {/* Seção de Métricas do Dashboard */}
      <div className="dashboard-metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon"><Wallet size={36}/></div>
          <div className="metric-content">
            <h3>Saldo em Caixa</h3>
            <p className="value">{dashboardMetrics.saldoGeralCaixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon"><TrendingUp size={36}/></div>
          <div className="metric-content">
            <h3>Receitas (Mês)</h3>
            <p className="value">{dashboardMetrics.receitasMesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>

        <div className="metric-card error">
          <div className="metric-icon"><TrendingDown size={36}/></div>
          <div className="metric-content">
            <h3>Despesas (Mês)</h3>
            <p className="value">{dashboardMetrics.despesasMesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>

        <div className={`metric-card ${dashboardMetrics.balancoMesAtual >= 0 ? 'info' : 'error'}`}>
          <div className="metric-icon"><DollarSign size={36}/></div>
          <div className="metric-content">
            <h3>Balanço (Mês)</h3>
            <p className="value">{dashboardMetrics.balancoMesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-icon"><ListChecks size={36}/></div>
          <div className="metric-content">
            <h3>Pedidos Ativos</h3>
            <p className="value">{dashboardMetrics.totalPedidosAtivos}</p>
          </div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-icon"><PackageCheck size={36}/></div>
          <div className="metric-content">
            <h3>Pedidos Entregues (Mês)</h3>
            <p className="value">{dashboardMetrics.pedidosEntreguesMes}</p>
          </div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-icon"><Info size={36}/></div>
          <div className="metric-content">
            <h3>Pedidos Prontos</h3>
            <p className="value">{dashboardMetrics.pedidosPorStatus.pronto}</p>
          </div>
        </div>

         <div className="metric-card secondary">
          <div className="metric-icon"><Clock size={36}/></div>
          <div className="metric-content">
            <h3>Pedidos Pendentes</h3>
            <p className="value">{dashboardMetrics.pedidosPorStatus.pendente}</p>
          </div>
        </div>
        
      </div>


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
        <button onClick={() => navigate('/precificacao')} className="admin-nav-button" style={{backgroundColor: '#B0E0E6', color: '#4682B4'}}>
            Precificação Detalhada
        </button>
        <button onClick={() => navigate('/fluxo-de-caixa')} className="admin-nav-button" style={{backgroundColor: '#FFF2CC', color: '#B8860B'}}>
            <DollarSign size={20}/> Fluxo de Caixa
        </button>
      </div>

      <div className="weekly-orders-section">
        <h2 className="weekly-orders-title"><Calendar size={20}/> Pedidos da Semana ({pedidosDaSemana.length})</h2>
        {pedidosDaSemana.length > 0 ? (
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
        )}
      </div>

      <button onClick={handleLogout} className="admin-logout-button">
        Sair
      </button>
    </div>
  );
}

export default Dashboard;
