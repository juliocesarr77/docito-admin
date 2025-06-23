// src/pages/CadastroPedidoAdmin.js

import React, { useEffect, useState, useMemo } from 'react'; // Adicionado useMemo
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, DollarSign, Edit3 } from 'lucide-react'; // Novos ícones
import './CadastroPedido.css'; // Mantido o CSS existente

const Notificacao = ({ mensagem, tipo, onDismiss }) => (
    <div className={`notificacao ${tipo}`}>
        {mensagem}
        <button onClick={onDismiss} style={{ marginLeft: '15px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
    </div>
);

const CadastroPedidoAdmin = () => {
    const { currentUser, db } = useAuth();
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [endereco, setEndereco] = useState('');
    const [numero, setNumero] = useState('');
    const [pontoReferencia, setPontoReferencia] = useState('');
    const [produto, setProduto] = useState('');
    const [valor, setValor] = useState(''); // Valor total do pedido
    const [dataEntrega, setDataEntrega] = useState('');
    const [horaEntrega, setHoraEntrega] = useState('');

    // NOVOS ESTADOS PARA PAGAMENTO E DETALHES
    const [corForminha, setCorForminha] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [statusPagamento, setStatusPagamento] = useState('Pendente'); // 'Pendente', 'Pago', 'Parcial'
    const [valorPago, setValorPago] = useState(''); // Valor efetivamente pago pelo cliente

    const [notificacao, setNotificacao] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const pedidoEditar = location.state?.pedido || null;
    const isEditando = !!pedidoEditar;

    // Efeito para carregar dados do pedido para edição
    useEffect(() => {
        if (isEditando && pedidoEditar) {
            setNome(pedidoEditar.nome || '');
            setTelefone(pedidoEditar.telefone || '');
            setEndereco(pedidoEditar.endereco || '');
            setNumero(pedidoEditar.numero || '');
            setPontoReferencia(pedidoEditar.pontoReferencia || '');
            setProduto(pedidoEditar.produto || '');
            setValor(pedidoEditar.valor?.toString() || '');
            setDataEntrega(pedidoEditar.dataEntrega || '');
            setHoraEntrega(pedidoEditar.horaEntrega || '');
            setCorForminha(pedidoEditar.corForminha || ''); // Carrega cor da forminha
            setObservacoes(pedidoEditar.observacoes || ''); // Carrega observações
            setStatusPagamento(pedidoEditar.statusPagamento || 'Pendente'); // Carrega status do pagamento
            setValorPago(pedidoEditar.valorPago?.toString() || ''); // Carrega valor pago
        }
    }, [isEditando, pedidoEditar]);

    // Lógica para calcular saldo devedor e ajustar valorPago automaticamente
    const saldoDevedor = useMemo(() => {
        const total = parseFloat(valor) || 0;
        const pago = parseFloat(valorPago) || 0;
        return total - pago;
    }, [valor, valorPago]);

    // Efeito para ajustar valorPago baseado no statusPagamento e valor total
    useEffect(() => {
        if (statusPagamento === 'Pago') {
            setValorPago(valor); // Se 'Pago', valorPago é igual ao valor total
        } else if (statusPagamento === 'Pendente') {
            setValorPago(''); // Se 'Pendente', valorPago é vazio
        }
        // Se 'Parcial', valorPago é mantido como está (ou o que o usuário digitou)
    }, [statusPagamento, valor]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || !db) return;

        // Validação básica
        if (!nome || !produto || !valor || parseFloat(valor) <= 0) {
            setNotificacao({ mensagem: 'Preencha Nome, Produto e um Valor Total válido.', tipo: 'erro' });
            return;
        }
        if (statusPagamento === 'Parcial' && (parseFloat(valorPago) <= 0 || parseFloat(valorPago) >= parseFloat(valor))) {
            setNotificacao({ mensagem: 'Para pagamento parcial, informe um valor pago entre 0 e o Valor Total.', tipo: 'erro' });
            return;
        }

        setLoading(true);
        setNotificacao(null);

        const dadosDoPedido = {
            nome, telefone, endereco, numero, pontoReferencia, produto,
            valor: parseFloat(valor), 
            dataEntrega, 
            horaEntrega, 
            status: isEditando ? pedidoEditar.status : 'pendente', // Mantém status na edição, ou 'pendente'
            // Novos campos
            corForminha,
            observacoes,
            statusPagamento,
            valorPago: parseFloat(valorPago) || 0, // Salva o valor pago como número
            saldoDevedor: saldoDevedor, // Salva o saldo devedor
            // Campos de pagamento e data de pagamento (do fluxo de caixa, que serão atualizados no Pedidos.js)
            // Mantém os existentes ao editar para não sobrescrever acidentalmente
            formaPagamento: pedidoEditar?.formaPagamento || null, 
            dataPagamento: pedidoEditar?.dataPagamento || null,
            userId: currentUser.uid, 
            createdAt: isEditando ? pedidoEditar.createdAt : serverTimestamp(), 
            updatedAt: serverTimestamp(),
        };

        try {
            if (isEditando) {
                const pedidoDocRef = doc(db, 'pedidos', pedidoEditar.id);
                await updateDoc(pedidoDocRef, dadosDoPedido);
                setNotificacao({ mensagem: 'Pedido atualizado com sucesso!', tipo: 'sucesso' });
            } else {
                await addDoc(collection(db, 'pedidos'), dadosDoPedido);
                setNotificacao({ mensagem: 'Novo pedido cadastrado com sucesso!', tipo: 'sucesso' });
            }

            // Redireciona após um pequeno atraso
            setTimeout(() => { navigate('/pedidos'); }, 1500); // Redireciona para a lista de pedidos

        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            setNotificacao({ mensagem: `Erro ao salvar pedido: ${error.message}`, tipo: 'erro' });
            setLoading(false);
        }
    };

    return (
        <div className="cadastro-container" style={{padding: '2rem'}}>
            <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 font-semibold self-start">
                <ArrowLeft size={18} className="mr-2"/>Voltar para o Painel
            </Link>
            {notificacao && (
                <Notificacao mensagem={notificacao.mensagem} tipo={notificacao.tipo} onDismiss={() => setNotificacao(null)} />
            )}
            <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="cadastro-titulo" style={{fontSize: '2.5rem', marginBottom: '2rem'}}>
                {isEditando ? 'Editar Pedido ✏️' : 'Cadastrar Novo Pedido 🍫'}
            </motion.h1>

            <motion.form onSubmit={handleSubmit} className="cadastro-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{padding: '2rem'}}>
                <label className="cadastro-label">Nome do Cliente</label>
                <input className="cadastro-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
                
                <label className="cadastro-label">Telefone</label>
                <input className="cadastro-input" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                
                <label className="cadastro-label">Endereço</label>
                <input className="cadastro-input" type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                
                <label className="cadastro-label">Número</label>
                <input className="cadastro-input" type="text" value={numero} onChange={(e) => setNumero(e.target.value)} />
                
                <label className="cadastro-label">Ponto de Referência</label>
                <input className="cadastro-input" type="text" value={pontoReferencia} onChange={(e) => setPontoReferencia(e.target.value)} />
                
                <label className="cadastro-label">Produto(s)</label>
                <textarea className="cadastro-input" value={produto} onChange={(e) => setProduto(e.target.value)} rows="5" required />
                
                <label className="cadastro-label">Valor Total (R$)</label>
                <input className="cadastro-input" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                
                {/* NOVO CAMPO: Cor da Forminha */}
                <label className="cadastro-label flex items-center gap-2"><Palette size={18}/>Cor da Forminha</label>
                <input className="cadastro-input" type="text" value={corForminha} onChange={(e) => setCorForminha(e.target.value)} placeholder="Ex: Rosa Bebê, Dourado" />

                {/* NOVO BLOCO: Status de Pagamento e Valor Pago */}
                <h3 className="cadastro-subtitulo flex items-center gap-2 mt-6 mb-4"><DollarSign size={20}/> Status do Pagamento</h3>
                <div className="status-pagamento-group">
                    <label>
                        <input type="radio" value="Pendente" checked={statusPagamento === 'Pendente'} onChange={() => setStatusPagamento('Pendente')} />
                        Pendente
                    </label>
                    <label>
                        <input type="radio" value="Parcial" checked={statusPagamento === 'Parcial'} onChange={() => setStatusPagamento('Parcial')} />
                        Parcial
                    </label>
                    <label>
                        <input type="radio" value="Pago" checked={statusPagamento === 'Pago'} onChange={() => setStatusPagamento('Pago')} />
                        Pago
                    </label>
                </div>

                {statusPagamento === 'Parcial' && (
                    <div className="mt-4">
                        <label className="cadastro-label">Valor Pago (R$)</label>
                        <input 
                            className="cadastro-input" 
                            type="number" 
                            step="0.01" 
                            value={valorPago} 
                            onChange={(e) => setValorPago(e.target.value)} 
                            placeholder="Informe o valor já pago"
                            required
                        />
                    </div>
                )}

                {(statusPagamento === 'Parcial' || statusPagamento === 'Pendente') && (
                    <div className="pagamento-resumo mt-4">
                        <p className="cadastro-label">Valor Total: <span className="font-bold text-lg">{parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                        <p className="cadastro-label">Valor Pago: <span className="font-bold text-lg text-green-600">{parseFloat(valorPago || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                        <p className="cadastro-label">Saldo Devedor: <span className="font-bold text-lg text-red-600">{saldoDevedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                    </div>
                )}
                
                <label className="cadastro-label flex items-center gap-2 mt-6"><Edit3 size={18}/>Observações</label>
                <textarea className="cadastro-input" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="3" placeholder="Adicione observações importantes sobre o pedido, cliente ou entrega."></textarea>

                <label className="cadastro-label">Data de Entrega</label>
                <input className="cadastro-input" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
                
                <label className="cadastro-label">Hora de Entrega</label>
                <input className="cadastro-input" type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />
                
                <button type="submit" className="cadastro-botao" disabled={loading}>
                    {loading ? 'Salvando...' : (isEditando ? 'Salvar Alterações' : 'Cadastrar Pedido')}
                </button>
            </motion.form>
        </div>
    );
};

export default CadastroPedidoAdmin;