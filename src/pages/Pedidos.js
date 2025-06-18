// src/pages/Pedidos.js

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
// CORREÇÃO AQUI: Removendo 'query' e 'firebaseOrderBy' da importação
import { collection, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; 
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Trash, ArrowUp, Clock, Factory, PackageCheck, CheckCircle } from 'lucide-react';
import './Pedidos.css';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Pedidos = () => {
    const { db } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // NOVO: Estados para paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [pedidosPorPagina] = useState(9); // 9 cards por página

    useEffect(() => {
        if (!db) { setLoading(false); return; }
        // Agora, 'q' é apenas a referência da coleção, sem 'query' nem 'orderBy'
        const q = collection(db, 'pedidos'); 

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPedidos(lista);
            setLoading(false);
        }, (error) => {
            console.error('Erro ao buscar pedidos:', error);
            setPedidos([]);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const proximoStatus = (statusAtual) => {
        const ordem = ['pendente', 'em produção', 'pronto', 'entregue'];
        const atual = ordem.indexOf(statusAtual?.toLowerCase());
        return ordem[(atual + 1) % ordem.length];
    };

    const atualizarStatus = async (id, statusAtual) => {
        let novoStatus = proximoStatus(statusAtual);

        if (statusAtual.toLowerCase() === 'entregue') {
            const confirmar = window.confirm('O pedido já foi entregue. Deseja realmente mudar o status para "pendente" novamente?');
            if (!confirmar) {
                return;
            }
        }

        try {
            await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
        } catch (error) { console.error('Erro ao atualizar status:', error); }
    };

    const excluirPedido = async (id) => {
        if (window.confirm('Deseja excluir este pedido?')) {
            try { await deleteDoc(doc(db, 'pedidos', id)); } 
            catch (error) { console.error('Erro ao excluir pedido:', error); }
        }
    };
    
    const contarPorStatus = (status) => pedidos.filter((p) => p.status === status).length;

    const pedidosFiltrados = useMemo(() => {
        if (!pedidos) return [];

        let listaFiltrada = filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.status === filtro);
        
        // Aplica o filtro de busca textual
        listaFiltrada = listaFiltrada.filter(pedido => {
            const termoBusca = !searchTerm || 
                Object.values(pedido).some(val => 
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                );
            return termoBusca;
        });

        // NOVA LÓGICA DE ORDENAÇÃO POR DATA DE ENTREGA
        listaFiltrada.sort((a, b) => {
            const dataA = a.dataEntrega ? new Date(a.dataEntrega) : null;
            const dataB = b.dataEntrega ? new Date(b.dataEntrega) : null;
            const hoje = new Date();

            // Pedidos sem data de entrega vão para o final
            if (!dataA && !dataB) return 0;
            if (!dataA) return 1;
            if (!dataB) return -1;

            // Pedidos com status 'entregue' vão para o final da lista principal
            if (a.status === 'entregue' && b.status !== 'entregue') return 1;
            if (a.status !== 'entregue' && b.status === 'entregue') return -1;
            
            const diffA = differenceInDays(dataA, hoje);
            const diffB = differenceInDays(dataB, hoje);

            return diffA - diffB;
        });

        return listaFiltrada;
    }, [pedidos, filtro, searchTerm]);

    // Lógica da Paginação
    const ultimoPedidoIndex = paginaAtual * pedidosPorPagina;
    const primeiroPedidoIndex = ultimoPedidoIndex - pedidosPorPagina;
    const pedidosDaPagina = pedidosFiltrados.slice(primeiroPedidoIndex, ultimoPedidoIndex);
    const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);

    // Componente para a notificação de dias
    const NotificacaoDias = ({ dataEntrega, status }) => {
        if (!dataEntrega || status === 'entregue') return null; 
        try {
            const data = new Date(dataEntrega);
            const hoje = new Date();
            const diff = differenceInDays(data, hoje);

            let classe = 'tranquilo';
            let texto = '';

            if (diff > 0) {
                classe = diff <= 1 ? 'urgente' : (diff <= 3 ? 'atencao' : 'tranquilo');
                texto = `Faltam ${diff} dia${diff > 1 ? 's' : ''}`;
            } else if (diff === 0) {
                classe = 'urgente';
                texto = 'Entrega hoje!';
            } else {
                classe = 'urgente';
                texto = `Atrasado há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? 's' : ''}`;
            }
            
            return <span className={`dias-entrega ${classe}`}>{texto}</span>

        } catch (error) {
            console.error("Erro ao calcular dias de entrega:", error);
            return null;
        }
    };

    return (
        <div className="dashboard-container">
            <Link to="/dashboard" className="text-indigo-600 font-semibold mb-8 inline-block self-start">← Voltar para o Painel</Link>
            <h1 className="dashboard-title">Gerenciamento de Pedidos</h1>
            
            <div className="status-table">
                <button className={`status-cell ${filtro === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltro('todos')}>Todos <span className="status-count">({pedidos.length})</span></button>
                <button className={`status-cell pendente ${filtro === 'pendente' ? 'ativo' : ''}`} onClick={() => setFiltro('pendente')}><Clock size={16}/> Pendentes <span className="status-count">({contarPorStatus('pendente')})</span></button>
                <button className={`status-cell em-producao ${filtro === 'em produção' ? 'ativo' : ''}`} onClick={() => setFiltro('em produção')}><Factory size={16}/> Em Produção <span className="status-count">({contarPorStatus('em produção')})</span></button>
                <button className={`status-cell pronto ${filtro === 'pronto' ? 'ativo' : ''}`} onClick={() => setFiltro('pronto')}><PackageCheck size={16}/> Prontos <span className="status-count">({contarPorStatus('pronto')})</span></button>
                <button className={`status-cell entregue ${filtro === 'entregue' ? 'ativo' : ''}`} onClick={() => setFiltro('entregue')}><CheckCircle size={16}/> Entregues <span className="status-count">({contarPorStatus('entregue')})</span></button>
            </div>

            <div className="dashboard-search">
                <input type="text" placeholder="Pesquisar em todos os campos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            {loading ? <p>Carregando pedidos...</p> : (
                <>
                    <ul className="card-grid">
                        {pedidosDaPagina.map((pedido) => (
                            <motion.li key={pedido.id} className="pedido-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="cliente-nome">{pedido.nome}</p>
                                        <p className="text-sm text-gray-600"><strong>Telefone:</strong> {pedido.telefone}</p>
                                        <p className="text-sm text-gray-600"><strong>Endereço:</strong> {pedido.endereco}, {pedido.numero}</p>
                                        <p className="text-sm text-gray-600 data-entrega-container">
                                            <strong>Entrega:</strong> {pedido.dataEntrega ? format(new Date(pedido.dataEntrega), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'} às {pedido.horaEntrega || 'N/A'}
                                            <NotificacaoDias dataEntrega={pedido.dataEntrega} status={pedido.status} />
                                        </p>
                                        <p className="text-sm text-gray-600 mt-2"><strong>Pedido:</strong><br/>{pedido.produto}</p>
                                        <p className="text-sm font-semibold mt-1"><strong>R$:</strong> {pedido.valor?.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 capitalize"><strong>Status:</strong> {pedido.status}</p>
                                    </div>
                                    <div className="action-buttons">
                                        <button onClick={() => navigate(`/editar-pedido/${pedido.id}`, { state: { pedido } })} className="home-button-editar" title="Editar Pedido"><Pencil size={16} /></button>
                                        <button onClick={() => excluirPedido(pedido.id)} className="home-button-excluir" title="Excluir Pedido"><Trash size={16} /></button>
                                        <button onClick={() => atualizarStatus(pedido.id, pedido.status)} className="home-button-avancar" title="Avançar status"><ArrowUp size={16} /></button>
                                    </div>
                                </div>
                            </motion.li>
                        ))}
                    </ul>
                    {/* Componente de Paginação */}
                    <div className="dashboard-pagination">
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(numero => (
                            <button key={numero} onClick={() => setPaginaAtual(numero)} className={paginaAtual === numero ? 'active' : ''}>
                                {numero}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Pedidos;