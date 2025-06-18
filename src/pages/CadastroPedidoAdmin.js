// src/pages/CadastroPedidoAdmin.js

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import './CadastroPedido.css';

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
    const [valor, setValor] = useState('');
    const [dataEntrega, setDataEntrega] = useState('');
    const [horaEntrega, setHoraEntrega] = useState('');
    const [notificacao, setNotificacao] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const pedidoEditar = location.state?.pedido || null;
    const isEditando = !!pedidoEditar;

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
        }
    }, [isEditando, pedidoEditar]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || !db) return;

        if (!nome || !produto || !valor) {
            setNotificacao({ mensagem: 'Preencha ao menos Nome, Produto e Valor.', tipo: 'erro' });
            return;
        }
        
        setLoading(true);
        setNotificacao(null);

        const dadosDoPedido = {
            nome, telefone, endereco, numero, pontoReferencia, produto,
            valor: parseFloat(valor), dataEntrega, horaEntrega, status: 'pendente',
            userId: currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };

        try {
            if (isEditando) {
                const pedidoDocRef = doc(db, 'pedidos', pedidoEditar.id);
                await updateDoc(pedidoDocRef, { ...dadosDoPedido, updatedAt: serverTimestamp() });
                setNotificacao({ mensagem: 'Pedido atualizado com sucesso!', tipo: 'sucesso' });
            } else {
                await addDoc(collection(db, 'pedidos'), dadosDoPedido);
                setNotificacao({ mensagem: 'Novo pedido cadastrado com sucesso!', tipo: 'sucesso' });
            }

            setTimeout(() => { navigate('/dashboard'); }, 1500);

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