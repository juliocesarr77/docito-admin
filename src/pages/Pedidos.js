// src/pages/Pedidos.js

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy as firebaseOrderBy, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Trash, ArrowUp, Clock, Factory, PackageCheck, CheckCircle, DollarSign, PiggyBank, Eye, HelpCircle, Palette } from 'lucide-react'; 
import './Pedidos.css';
import { format, differenceInDays, parseISO } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Pedidos = () => {
    const { db } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [showPagamentoModal, setShowPagamentoModal] = useState(false);
    const [pedidoParaPagar, setPedidoParaPagar] = useState(null);
    const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); 

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [pedidosPorPagina] = useState(9); 

    useEffect(() => {
        if (!db) { setLoading(false); return; }
        const q = query(collection(db, 'pedidos'), firebaseOrderBy('createdAt', 'desc')); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPedidos(lista);
            setLoading(false);
        }, (error) => {
            console.error('Erro ao buscar pedidos:', error);
            toast.error('Erro ao carregar pedidos.');
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

    const handleAtualizarStatusClick = (pedido) => {
        const statusAtual = pedido.status?.toLowerCase();
        const proximo = proximoStatus(statusAtual);

        console.log(`Clicado para avançar pedido ID: ${pedido.id}, Status Atual: ${statusAtual}, Próximo Status: ${proximo}`);
        console.log('Dados do Pedido:', pedido);

        if (statusAtual === 'entregue') {
            const confirmar = window.confirm('O pedido já foi entregue. Deseja realmente mudar o status para "pendente" novamente?');
            if (!confirmar) return;
            atualizarStatusNoFirebase(pedido.id, 'pendente', pedido);
        } 
        else if (proximo === 'entregue') {
            if (pedido.statusPagamento === 'Pago' || !pedido.statusPagamento || pedido.saldoDevedor <= 0) { // Adicionado saldoDevedor <= 0
                console.log('Pedido já pago ou sem status de pagamento. Avançando diretamente para Entregue.');
                atualizarStatusNoFirebase(pedido.id, proximo, pedido);
            } 
            else if (pedido.statusPagamento === 'Pendente' || pedido.statusPagamento === 'Parcial') {
                console.log('Pedido com pagamento pendente/parcial. Abrindo modal de pagamento.');
                setPedidoParaPagar(pedido);
                setShowPagamentoModal(true);
                setFormaPagamentoSelecionada(''); 
            } else {
                console.warn('Status de pagamento inesperado, tentando avançar diretamente:', pedido.statusPagamento);
                atualizarStatusNoFirebase(pedido.id, proximo, pedido);
            }
        } 
        else {
            console.log('Avançando status normal (não é entrega).');
            atualizarStatusNoFirebase(pedido.id, proximo, pedido);
        }
    };

    const atualizarStatusNoFirebase = async (id, novoStatus, pedidoCompleto, formaPagamento = null) => {
        setIsUpdatingStatus(true);
        console.log(`Iniciando atualização para pedido ID: ${id}, Novo Status: ${novoStatus}, Forma Pagamento: ${formaPagamento}`);
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            
            const pedidoAtual = pedidoCompleto || pedidos.find(p => p.id === id); 
            if (!pedidoAtual) {
                toast.error('Erro: Dados do pedido não encontrados para atualização.');
                console.error('Dados do pedido não encontrados para atualização:', id);
                return;
            }

            const updateData = { 
                status: novoStatus, 
                updatedAt: serverTimestamp() 
            };

            if (novoStatus === 'entregue') {
                updateData.dataPagamento = serverTimestamp(); 
                updateData.formaPagamento = formaPagamento; 

                // Força o status de pagamento para 'Pago' ao entregar
                updateData.statusPagamento = 'Pago';
                updateData.valorPago = parseFloat(pedidoAtual.valor) || 0; 
                updateData.saldoDevedor = 0;

                console.log('Registrando receita no fluxo de caixa...');
                await addDoc(collection(db, 'fluxoDeCaixa'), {
                    tipo: 'receita',
                    data: serverTimestamp(),
                    descricao: `Pagamento de Pedido - ${pedidoAtual.nome}`,
                    valor: parseFloat(pedidoAtual.valor) || 0, 
                    formaPagamento: formaPagamento,
                    referenciaId: pedidoAtual.id,
                    clienteNome: pedidoAtual.nome,
                    produtoNome: pedidoAtual.produto 
                });
                toast.success('Pedido entregue e receita registrada!');

            } else if (novoStatus === 'pendente') { 
                updateData.dataPagamento = null;
                updateData.formaPagamento = null;
                updateData.statusPagamento = 'Pendente'; 
                updateData.valorPago = 0;
                updateData.saldoDevedor = parseFloat(pedidoAtual.valor) || 0; 
                toast.info('Pedido voltou para pendente e dados de pagamento resetados.');
            }

            console.log('Atualizando documento do pedido no Firebase com:', updateData);
            await updateDoc(pedidoRef, updateData);
            toast.success(`Status do pedido atualizado para "${novoStatus}"`);

        } catch (error) { 
            console.error('Erro detalhado ao atualizar status ou registrar receita:', error); 
            toast.error(`Falha ao atualizar pedido: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsUpdatingStatus(false);
            setShowPagamentoModal(false); 
            setPedidoParaPagar(null);
            setFormaPagamentoSelecionada('');
        }
    };

    const excluirPedido = async (id) => {
        if (window.confirm('Deseja excluir este pedido?')) {
            try { 
                await deleteDoc(doc(db, 'pedidos', id)); 
                toast.success('Pedido excluído com sucesso!');
            } 
            catch (error) { 
                console.error('Erro ao excluir pedido:', error); 
                toast.error(`Falha ao excluir pedido: ${error.message || 'Erro desconhecido'}`);
            }
        }
    };
    
    const contarPorStatus = (status) => pedidos.filter((p) => p.status === status).length;

    const pedidosFiltrados = useMemo(() => {
        if (!pedidos) return [];

        let listaFiltrada = filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.status === filtro);
        
        listaFiltrada = listaFiltrada.filter(pedido => {
            const termoBusca = !searchTerm || 
                Object.values(pedido).some(val => 
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                );
            return termoBusca;
        });

        listaFiltrada.sort((a, b) => {
            const dataA = a.dataEntrega ? parseISO(a.dataEntrega) : null;
            const dataB = b.dataEntrega ? parseISO(b.dataEntrega) : null;
            const hoje = new Date();

            if (!dataA && !dataB) return 0;
            if (!dataA) return 1;
            if (!dataB) return -1;

            if (a.status === 'entregue' && b.status !== 'entregue') return 1; 
            if (a.status !== 'entregue' && b.status === 'entregue') return -1;
            
            const diffA = differenceInDays(dataA, hoje);
            const diffB = differenceInDays(dataB, hoje);

            return diffA - diffB;
        });

        return listaFiltrada;
    }, [pedidos, filtro, searchTerm]);

    const ultimoPedidoIndex = paginaAtual * pedidosPorPagina;
    const primeiroPedidoIndex = ultimoPedidoIndex - pedidosPorPagina;
    const pedidosDaPagina = pedidosFiltrados.slice(primeiroPedidoIndex, ultimoPedidoIndex);
    const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);

    const NotificacaoDias = ({ dataEntrega, status }) => {
        if (!dataEntrega || status === 'entregue') return null; 
        try {
            const data = parseISO(dataEntrega);
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
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            <Link to="/dashboard" className="text-indigo-600 font-semibold mb-8 inline-block self-start">← Voltar para o Painel</Link>
            <h1 className="dashboard-title">Gerenciamento de Pedidos</h1>
            
            <div className="status-table">
                <button className={`status-cell ${filtro === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltro('todos')}>Todos <span className="status-count">({pedidos.length})</span></button>
                <button className={`status-cell pendente ${filtro === 'pendente' ? 'ativo' : ''}`} onClick={() => setFiltro('pendente')}><Clock size={16}/> Pendentes <span className="status-count">({contarPorStatus('pendente')})</span></button>
                <button className="status-cell em-producao" onClick={() => setFiltro('em produção')}><Factory size={16}/> Em Produção <span className="status-count">({contarPorStatus('em produção')})</span></button>
                <button className="status-cell pronto" onClick={() => setFiltro('pronto')}><PackageCheck size={16}/> Prontos <span className="status-count">({contarPorStatus('pronto')})</span></button>
                <button className="status-cell entregue" onClick={() => setFiltro('entregue')}><CheckCircle size={16}/> Entregues <span className="status-count">({contarPorStatus('entregue')})</span></button>
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
                                            <strong>Entrega:</strong> {pedido.dataEntrega ? format(parseISO(pedido.dataEntrega), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'} às {pedido.horaEntrega || 'N/A'}
                                            <NotificacaoDias dataEntrega={pedido.dataEntrega} status={pedido.status} />
                                        </p>
                                        <p className="text-sm text-gray-600 mt-2"><strong>Pedido:</strong><br/>{pedido.produto}</p>
                                        {pedido.corForminha && (
                                            <p className="text-sm text-gray-600"><Palette size={14} className="inline mr-1"/><strong>Cor da Forminha:</strong> {pedido.corForminha}</p>
                                        )}
                                        {pedido.observacoes && (
                                            <p className="text-sm text-gray-600"><Eye size={14} className="inline mr-1"/><strong>Obs:</strong> {pedido.observacoes}</p>
                                        )}
                                        
                                        <p className="text-sm font-semibold mt-1"><strong>Valor Total:</strong> {parseFloat(pedido.valor || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p>
                                        
                                        {pedido.statusPagamento && (
                                            <div className="text-sm text-gray-700 mt-1">
                                                <p className={`capitalize ${pedido.statusPagamento === 'Pago' ? 'text-green-600 font-bold' : pedido.statusPagamento === 'Parcial' ? 'text-orange-500 font-bold' : 'text-red-600 font-bold'}`}>
                                                    <DollarSign size={14} className="inline mr-1"/><strong>Pagamento:</strong> {pedido.statusPagamento}
                                                </p>
                                                {pedido.statusPagamento !== 'Pendente' && (
                                                    <p className="text-xs text-gray-600">
                                                        <CheckCircle size={12} className="inline mr-1"/>Pago: {parseFloat(pedido.valorPago || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                                    </p>
                                                )}
                                                {pedido.statusPagamento !== 'Pago' && (pedido.saldoDevedor > 0) && (
                                                    <p className="text-xs text-gray-600">
                                                        <PiggyBank size={12} className="inline mr-1"/>Falta: {parseFloat(pedido.saldoDevedor || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                                    </p>
                                                )}
                                                {pedido.formaPagamento && pedido.status === 'entregue' && (
                                                    <p className="text-xs text-gray-600">
                                                        <HelpCircle size={12} className="inline mr-1"/>Via: {pedido.formaPagamento}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        <p className="text-xs text-gray-500 capitalize mt-1"><strong>Status Pedido:</strong> {pedido.status}</p>
                                    </div>
                                    <div className="action-buttons">
                                        <button onClick={() => navigate(`/editar-pedido/${pedido.id}`, { state: { pedido } })} className="home-button-editar" title="Editar Pedido" disabled={isUpdatingStatus}><Pencil size={16} /></button>
                                        <button onClick={() => excluirPedido(pedido.id)} className="home-button-excluir" title="Excluir Pedido" disabled={isUpdatingStatus}><Trash size={16} /></button>
                                        <button onClick={() => handleAtualizarStatusClick(pedido)} className="home-button-avancar" title="Avançar status" disabled={isUpdatingStatus}>
                                            <ArrowUp size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.li>
                        ))}
                    </ul>
                    <div className="dashboard-pagination">
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(numero => (
                            <button key={numero} onClick={() => setPaginaAtual(numero)} className={paginaAtual === numero ? 'active' : ''}>
                                {numero}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {showPagamentoModal && pedidoParaPagar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4 text-center">
                        <DollarSign size={48} className="mx-auto text-green-500 mb-4" />
                        <h3 className="mt-4 text-xl font-bold text-gray-800">Confirmar Pagamento e Entrega</h3>
                        <p className="mt-2 text-gray-600">Pedido de <strong>{pedidoParaPagar.nome}</strong> no valor de <strong>{parseFloat(pedidoParaPagar.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.</p>
                        
                        {(pedidoParaPagar.statusPagamento === 'Pendente' || pedidoParaPagar.statusPagamento === 'Parcial') && (
                            <p className="mt-2 text-red-600 font-bold">Saldo a receber: {parseFloat(pedidoParaPagar.saldoDevedor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        )}

                        <p className="mt-4 text-gray-700 font-semibold">Selecione a forma de pagamento:</p>
                        <select 
                            className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formaPagamentoSelecionada}
                            onChange={(e) => setFormaPagamentoSelecionada(e.target.value)}
                        >
                            <option value="">Escolha...</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartao de Debito">Cartão de Débito</option>
                            <option value="Cartao de Credito">Cartão de Crédito</option>
                            <option value="Pix">Pix</option>
                            <option value="Transferencia Bancaria">Transferência Bancária</option>
                            <option value="Outro">Outro</option>
                        </select>
                        {formaPagamentoSelecionada === '' && <p className="text-red-500 text-sm mt-1">Por favor, selecione uma forma de pagamento.</p>}

                        <div className="mt-8 flex justify-center gap-4">
                            <button 
                                onClick={() => { setShowPagamentoModal(false); setPedidoParaPagar(null); setFormaPagamentoSelecionada(''); }} 
                                className="py-2 px-6 bg-gray-300 rounded-md font-semibold hover:bg-gray-400"
                                disabled={isUpdatingStatus}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => atualizarStatusNoFirebase(pedidoParaPagar.id, 'entregue', pedidoParaPagar, formaPagamentoSelecionada)} 
                                className="py-2 px-6 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700"
                                disabled={isUpdatingStatus || formaPagamentoSelecionada === ''} 
                            >
                                {isUpdatingStatus ? 'Confirmando...' : 'Confirmar e Entregar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pedidos;
