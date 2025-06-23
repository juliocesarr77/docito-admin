// src/pages/FluxoDeCaixa.js

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy as firebaseOrderBy, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { 
    PlusCircle, MinusCircle, Wallet, TrendingUp, TrendingDown,
    Search, List, Edit, Trash2, ArrowLeft
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './FluxoDeCaixa.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Componente para o Modal de Lançamento Manual (Entrada/Saída)
const LancamentoModal = ({ show, onClose, onSave, transactionToEdit, isLoading, initialType }) => {
    const [tipo, setTipo] = useState(initialType || 'saida');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState('');
    const [formaPagamento, setFormaPagamento] = useState('');
    const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));

    const categoriasDespesa = ['Insumos', 'Perdas', 'Contas Fixas', 'Salários/Pró-Labore', 'Marketing', 'Manutenção', 'Outros'];
    const formasPagamento = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix', 'Transferência Bancária', 'Boleto', 'Outro'];

    useEffect(() => {
        if (transactionToEdit) {
            setTipo(transactionToEdit.tipo);
            setValor(transactionToEdit.valor.toString());
            setDescricao(transactionToEdit.descricao);
            setCategoria(transactionToEdit.categoria || '');
            setFormaPagamento(transactionToEdit.formaPagamento || '');
            setData(transactionToEdit.data?.toDate ? format(transactionToEdit.data.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        } else {
            setTipo(initialType || 'saida');
            setValor('');
            setDescricao('');
            setCategoria('');
            setFormaPagamento('');
            setData(format(new Date(), 'yyyy-MM-dd'));
        }
    }, [transactionToEdit, show, initialType]);

    const handleSubmit = () => {
        if (!valor || parseFloat(valor) <= 0 || !descricao || !data || !formaPagamento || (tipo === 'saida' && !categoria)) {
            toast.error('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // NOVO: Criar um objeto de dados e adicionar 'id' apenas se for edição
        const transactionData = { 
            tipo, 
            valor: parseFloat(valor), 
            descricao, 
            categoria: tipo === 'saida' ? categoria : null,
            formaPagamento,
            data: parseISO(data),
        };

        if (transactionToEdit) {
            transactionData.id = transactionToEdit.id; // Adiciona o ID apenas para transações de edição
        }

        onSave(transactionData); // Passa o objeto sem 'id: undefined' para novos lançamentos
    };

    if (!show) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-group-radio">
                        <label><input type="radio" value="saida" checked={tipo === 'saida'} onChange={() => setTipo('saida')} /> Saída <TrendingDown size={18} color="red"/></label>
                        <label><input type="radio" value="entrada" checked={tipo === 'entrada'} onChange={() => setTipo('entrada')} /> Entrada <TrendingUp size={18} color="green"/></label>
                    </div>

                    <label className="input-label">Valor (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="modal-input" placeholder="Ex: 150.00" />

                    <label className="input-label">Descrição</label>
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="modal-textarea" placeholder="Ex: Compra de leite condensado - Fornecedor X" rows="3"></textarea>

                    <label className="input-label">Data</label>
                    <input type="date" value={data} onChange={e => setData(e.target.value)} className="modal-input" />

                    <label className="input-label">Forma de Pagamento/Recebimento</label>
                    <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="modal-input">
                        <option value="">Selecione...</option>
                        {formasPagamento.map(fp => <option key={fp} value={fp}>{fp}</option>)}
                    </select>

                    {tipo === 'saida' && (
                        <>
                            <label className="input-label">Categoria de Despesa</label>
                            <select value={categoria} onChange={e => setCategoria(e.target.value)} className="modal-input">
                                <option value="">Selecione...</option>
                                {categoriasDespesa.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleSubmit} className="modal-save-btn" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : (transactionToEdit ? 'Salvar Edição' : 'Lançar')}
                    </button>
                    <button onClick={onClose} className="modal-cancel-btn" disabled={isLoading}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};


function FluxoDeCaixa() {
    const { currentUser, db, loading: authLoading } = useAuth();
    const [transacoes, setTransacoes] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(''); // Estado de erro para exibir mensagem

    // Estados para filtros
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('todos');
    const [filtroFormaPagamento, setFiltroFormaPagamento] = useState('todos');
    const [filtroPeriodo, setFiltroPeriodo] = useState('mesAtual');
    const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
    const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados do Modal
    const [showLancamentoModal, setShowLancamentoModal] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState(null);
    const [isSavingTransaction, setIsSavingTransaction] = useState(false);
    const [modalInitialType, setModalInitialType] = useState('saida');

    const categoriasDespesaFiltro = ['Insumos', 'Perdas', 'Contas Fixas', 'Salários/Pró-Labore', 'Marketing', 'Manutenção', 'Outros'];
    const formasPagamentoFiltro = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix', 'Transferência Bancária', 'Boleto', 'Outro'];


    useEffect(() => {
        if (authLoading || !currentUser || !db) {
            setLoadingData(false);
            return;
        }

        const q = query(collection(db, 'fluxoDeCaixa'), firebaseOrderBy('data', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransacoes(lista);
            setLoadingData(false);
            setError(''); // Limpa erro ao carregar com sucesso
        }, (err) => {
            console.error("Erro ao buscar transações:", err);
            setError("Falha ao carregar fluxo de caixa. Verifique sua conexão ou permissões."); // Define a mensagem de erro
            setLoadingData(false);
        });
        return () => unsubscribe();
    }, [currentUser, db, authLoading]);

    // Lógica de filtragem e cálculo de saldos
    const transacoesFiltradas = useMemo(() => {
        let lista = transacoes;

        const hoje = new Date();
        let inicioPeriodo, fimPeriodo;

        if (filtroPeriodo === 'diaAtual') {
            inicioPeriodo = new Date(hoje.setHours(0,0,0,0));
            fimPeriodo = new Date(hoje.setHours(23,59,59,999));
        } else if (filtroPeriodo === 'semanaAtual') {
            inicioPeriodo = startOfWeek(hoje, { locale: ptBR });
            fimPeriodo = endOfWeek(hoje, { locale: ptBR });
        } else if (filtroPeriodo === 'mesAtual') {
            inicioPeriodo = startOfMonth(hoje);
            fimPeriodo = endOfMonth(hoje);
        } else if (filtroPeriodo === 'personalizado' && dataInicioPersonalizada && dataFimPersonalizada) {
            inicioPeriodo = parseISO(dataInicioPersonalizada);
            fimPeriodo = parseISO(dataFimPersonalizada);
            fimPeriodo.setHours(23,59,59,999);
        }

        if (filtroPeriodo !== 'todos') {
            lista = lista.filter(transacao => {
                const dataTransacao = transacao.data?.toDate();
                if (!dataTransacao) return false;
                return dataTransacao >= inicioPeriodo && dataTransacao <= fimPeriodo;
            });
        }
        
        if (filtroTipo !== 'todos') {
            lista = lista.filter(transacao => transacao.tipo === filtroTipo);
        }

        if (filtroCategoria !== 'todos') {
            lista = lista.filter(transacao => transacao.categoria === filtroCategoria);
        }

        if (filtroFormaPagamento !== 'todos') {
            lista = lista.filter(transacao => transacao.formaPagamento === filtroFormaPagamento);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            lista = lista.filter(transacao => 
                (transacao.descricao && transacao.descricao.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (transacao.clienteNome && transacao.clienteNome.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (transacao.produto && transacao.produto.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        const totalReceitas = lista.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0);
        const totalSaidas = lista.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + (t.valor || 0), 0);
        const saldoPeriodo = totalReceitas - totalSaidas;

        return { 
            lista, 
            totalReceitas, 
            totalSaidas, 
            saldoPeriodo,
            saldoGeral: transacoes.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0) - 
                        transacoes.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + (t.valor || 0), 0)
        };
    }, [transacoes, filtroTipo, filtroCategoria, filtroFormaPagamento, filtroPeriodo, dataInicioPersonalizada, dataFimPersonalizada, searchTerm]);


    // Funções de CRUD para lançamentos manuais
    const handleSaveTransaction = async (data) => {
        setIsSavingTransaction(true);
        try {
            if (data.id) {
                const transactionRef = doc(db, 'fluxoDeCaixa', data.id);
                const { id, ...updateData } = data; 
                await updateDoc(transactionRef, { ...updateData, updatedAt: serverTimestamp() });
                toast.success('Lançamento atualizado com sucesso!');
            } else {
                await addDoc(collection(db, 'fluxoDeCaixa'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                toast.success('Lançamento adicionado com sucesso!');
            }
            setShowLancamentoModal(false);
            setTransactionToEdit(null);
        } catch (e) {
            console.error("Erro ao salvar lançamento:", e);
            toast.error("Erro ao salvar lançamento.");
        } finally {
            setIsSavingTransaction(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Tem certeza que deseja deletar este lançamento?')) return;
        try {
            await deleteDoc(doc(db, 'fluxoDeCaixa', id));
            toast.success('Lançamento deletado!');
        } catch (e) {
            console.error("Erro ao deletar lançamento:", e);
            toast.error("Erro ao deletar lançamento.");
        }
    };

    const handleEditTransaction = (transaction) => {
        setTransactionToEdit(transaction);
        setShowLancamentoModal(true);
    };

    if (authLoading || loadingData) return <div className="loading-spinner">Carregando Fluxo de Caixa...</div>;
    if (!currentUser) return <div className="auth-error">Você precisa estar logado para acessar esta página.</div>;

    return (
        <div className="fluxo-caixa-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            
            <Link to="/dashboard" className="btn-voltar-dashboard"><ArrowLeft size={18} /> Voltar para o Painel</Link>
            
            <h1 className="fluxo-caixa-title"><Wallet size={36}/> Seu Fluxo de Caixa</h1>

            {/* AQUI: Exibindo a mensagem de erro se houver */}
            {error && <div className="error-message text-red-600 text-center mb-4 p-2 border border-red-400 bg-red-50 rounded-md">{error}</div>}

            {/* Resumo dos Saldos */}
            <div className="saldo-resumo-grid">
                <div className="saldo-card total">
                    <h3>Saldo Geral</h3>
                    <p className="valor">{transacoesFiltradas.saldoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="saldo-card entradas">
                    <h3>Entradas ({filtroPeriodo === 'todos' ? 'Total' : 'Período'})</h3>
                    <p className="valor">{transacoesFiltradas.totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="saldo-card saidas">
                    <h3>Saídas ({filtroPeriodo === 'todos' ? 'Total' : 'Período'})</h3>
                    <p className="valor">{transacoesFiltradas.totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="saldo-card balanco">
                    <h3>Balanço ({filtroPeriodo === 'todos' ? 'Total' : 'Período'})</h3>
                    <p className="valor">{transacoesFiltradas.saldoPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>

            {/* Botões de Ação */}
            <div className="action-buttons-fluxo">
                <button onClick={() => { setTransactionToEdit(null); setModalInitialType('entrada'); setShowLancamentoModal(true); }} className="btn-adicionar-entrada">
                    <PlusCircle size={20}/> Adicionar Entrada
                </button>
                <button onClick={() => { setTransactionToEdit(null); setModalInitialType('saida'); setShowLancamentoModal(true); }} className="btn-adicionar-saida">
                    <MinusCircle size={20}/> Adicionar Saída
                </button>
            </div>

            {/* Filtros e Busca */}
            <div className="filtros-container">
                <div className="filtro-group">
                    <label>Tipo:</label>
                    <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="receita">Entradas</option>
                        <option value="saida">Saídas</option>
                    </select>
                </div>
                <div className="filtro-group">
                    <label>Período:</label>
                    <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                        <option value="todos">Todo o Período</option>
                        <option value="diaAtual">Hoje</option>
                        <option value="semanaAtual">Semana Atual</option>
                        <option value="mesAtual">Mês Atual</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>
                {filtroPeriodo === 'personalizado' && (
                    <div className="filtro-group personalizado">
                        <label>De:</label>
                        <input type="date" value={dataInicioPersonalizada} onChange={e => setDataInicioPersonalizada(e.target.value)} />
                        <label>Até:</label>
                        <input type="date" value={dataFimPersonalizada} onChange={e => setDataFimPersonalizada(e.target.value)} />
                    </div>
                )}
                <div className="filtro-group">
                    <label>Categoria (Saídas):</label>
                    <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} disabled={filtroTipo === 'receita'}>
                        <option value="todos">Todas</option>
                        {categoriasDespesaFiltro.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                 <div className="filtro-group">
                    <label>Forma de Pgto.:</label>
                    <select value={filtroFormaPagamento} onChange={e => setFiltroFormaPagamento(e.target.value)}>
                        <option value="todos">Todas</option>
                        {formasPagamentoFiltro.map(fp => <option key={fp} value={fp}>{fp}</option>)}
                    </select>
                </div>
                <div className="filtro-group search">
                    <label htmlFor="search-input"><Search size={18} /></label>
                    <input id="search-input" type="text" placeholder="Buscar na descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Tabela de Transações */}
            <div className="transacoes-table-container">
                {transacoesFiltradas.lista.length > 0 ? (
                    <table className="transacoes-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Forma Pagamento</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transacoesFiltradas.lista.map(transacao => (
                                <tr key={transacao.id} className={transacao.tipo === 'receita' ? 'row-receita' : 'row-saida'}>
                                    <td>{transacao.data?.toDate ? format(transacao.data.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}</td>
                                    <td>
                                        {transacao.tipo === 'receita' ? 
                                            <span className="badge-receita">Entrada</span> : 
                                            <span className="badge-saida">Saída</span>
                                        }
                                    </td>
                                    <td>{transacao.descricao}</td>
                                    <td>{transacao.categoria || '-'}</td>
                                    <td>{transacao.formaPagamento || '-'}</td>
                                    <td>{transacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td>
                                        {transacao.tipo !== 'receita' && transacao.referenciaId === undefined ? (
                                            <>
                                                <button onClick={() => handleEditTransaction(transacao)} className="btn-table-edit" title="Editar"><Edit size={16}/></button>
                                                <button onClick={() => handleDeleteTransaction(transacao.id)} className="btn-table-delete" title="Deletar"><Trash2 size={16}/></button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Automático</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-transactions-message">
                        <List size={48} className="icon"/>
                        <h3>Nenhuma transação encontrada no período/filtro.</h3>
                        <p>Comece adicionando uma entrada ou saída manual, ou marque um pedido como entregue.</p>
                    </div>
                )}
            </div>

            <LancamentoModal
                show={showLancamentoModal}
                onClose={() => { setShowLancamentoModal(false); setTransactionToEdit(null); }}
                onSave={handleSaveTransaction}
                transactionToEdit={transactionToEdit}
                isLoading={isSavingTransaction}
                initialType={modalInitialType}
            />
        </div>
    );
}

export default FluxoDeCaixa;
