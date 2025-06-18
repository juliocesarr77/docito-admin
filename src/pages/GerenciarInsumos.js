// src/pages/GerenciarInsumos.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowLeft, Edit, X, PlusCircle } from 'lucide-react';
import './GerenciarInsumos.css'; // Importa nosso novo CSS

function GerenciarInsumos() {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('g');
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [editFormData, setEditFormData] = useState({ nome: '', preco: '', quantidade: '', unidade: '' });

  const { currentUser, db, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !currentUser || !db) { setLoading(false); return; }
    
    const q = query(collection(db, 'insumos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInsumos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar insumos: ", err);
      setError('Falha ao carregar insumos.');
      setLoading(false);
    });
    return () => unsubscribe;
  }, [currentUser, db, authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db) return; 
    try {
      const precoFloat = parseFloat(preco.replace(',', '.'));
      const quantidadeFloat = parseFloat(quantidade.replace(',', '.'));
      await addDoc(collection(db, 'insumos'), {
        nome, preco: precoFloat, quantidade: quantidadeFloat, unidade,
        custoPorUnidade: precoFloat / quantidadeFloat,
        createdAt: new Date(),
      });
      setNome(''); setPreco(''); setQuantidade(''); setUnidade('g');
      setSuccessMessage('Insumo cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError('Ocorreu um erro ao salvar.'); }
  };

  const handleDelete = async (id) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "insumos", id));
      setConfirmDeleteId(null);
    } catch (err) { setError("Ocorreu um erro ao deletar."); }
  };

  const openEditModal = (insumo) => {
    setEditingInsumo(insumo);
    setEditFormData({
        nome: insumo.nome, preco: insumo.preco.toString(),
        quantidade: insumo.quantidade.toString(), unidade: insumo.unidade,
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateInsumo = async (e) => {
    e.preventDefault();
    if (!db || !editingInsumo) return;
    try {
        const precoFloat = parseFloat(editFormData.preco.replace(',', '.'));
        const quantidadeFloat = parseFloat(editFormData.quantidade.replace(',', '.'));
        const updatedData = {
            nome: editFormData.nome, preco: precoFloat, quantidade: quantidadeFloat,
            unidade: editFormData.unidade, custoPorUnidade: precoFloat / quantidadeFloat,
        };
        await updateDoc(doc(db, "insumos", editingInsumo.id), updatedData);
        setEditingInsumo(null);
        setSuccessMessage('Insumo atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError("Ocorreu um erro ao atualizar."); }
  };
  
  if (authLoading) return <div className="p-8 text-center">Carregando autenticação...</div>;
  if (!currentUser) return <div className="p-8 text-center text-red-600 font-semibold">Erro: Você precisa estar logado.</div>;

  return (
    <div className="insumos-container">
      <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 font-semibold"><ArrowLeft size={18} className="mr-2"/>Voltar para o Painel</Link>
      <h1 className="insumos-header">📔 Gestão de Insumos</h1>
      <p className="insumos-subheader">Cadastre aqui todos os seus ingredientes e embalagens a partir da nota fiscal.</p>
      
      <div className="insumo-card">
        <div className="insumo-card-header"><h2 className="insumo-card-title">Cadastrar Novo Insumo</h2></div>
        <div className="insumo-card-content">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group col-span-2"><label htmlFor="nome">Nome do Produto</label><input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required/></div>
              <div className="form-group"><label htmlFor="preco">Preço Pago (R$)</label><input type="text" id="preco" value={preco} onChange={(e) => setPreco(e.target.value)} required/></div>
              <div className="form-group"><label htmlFor="quantidade">Quantidade</label><input type="text" id="quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required/></div>
              <div className="form-group col-span-2"><label htmlFor="unidade">Unidade de Medida</label><select id="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}><option value="g">Grama (g)</option><option value="kg">Quilograma (kg)</option><option value="ml">Mililitro (ml)</option><option value="l">Litro (l)</option><option value="un">Unidade (un)</option></select></div>
              <div className="form-actions"><button type="submit" className="btn btn-primary"><PlusCircle size={18}/>Salvar Insumo</button></div>
            </div>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {successMessage && <p className="text-green-500 mt-4">{successMessage}</p>}
        </div>
      </div>

      <div className="insumo-card">
        <div className="insumo-card-header"><h2 className="insumo-card-title">Insumos Cadastrados</h2></div>
        <div className="insumo-card-content">
          {loading ? ( <p>Carregando...</p> ) : insumos.length === 0 ? ( <p>Nenhum insumo cadastrado.</p> ) : (
            <table className="insumos-table">
                <thead><tr><th>Nome</th><th>Custo Unitário</th><th>Valor da Compra</th><th>Ações</th></tr></thead>
                <tbody>{insumos.map((insumo) => (<tr key={insumo.id}><td className="font-bold">{insumo.nome}</td><td>{(insumo.custoPorUnidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} / {insumo.unidade}</td><td>{(insumo.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({insumo.quantidade} {insumo.unidade})</td>
                <td className="action-buttons">
                    <button onClick={() => openEditModal(insumo)} className="edit-btn" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setConfirmDeleteId(insumo.id)} className="delete-btn" title="Deletar"><Trash2 size={18} /></button>
                </td></tr>))}</tbody>
            </table>
          )}
        </div>
      </div>

       {confirmDeleteId && (<div className="modal-backdrop"><div className="modal-content text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500"/><h3 className="modal-title mt-4">Confirmar Exclusão</h3><p className="text-gray-600 mt-2">Você tem certeza?</p><div className="modal-footer"><button onClick={() => setConfirmDeleteId(null)} className="btn btn-secondary">Cancelar</button><button onClick={() => handleDelete(confirmDeleteId)} className="btn btn-primary" style={{backgroundColor: 'var(--cor-perigo)'}}>Deletar</button></div></div></div>)}
       {editingInsumo && (<div className="modal-backdrop"><div className="modal-content"><div className="modal-header"><h3 className="modal-title">Editar Insumo</h3><button onClick={() => setEditingInsumo(null)} className="modal-close-btn"><X size={24}/></button></div><div className="modal-body"><form onSubmit={handleUpdateInsumo}><div className="form-group"><label htmlFor="edit-nome">Nome</label><input type="text" id="edit-nome" name="nome" value={editFormData.nome} onChange={handleEditFormChange} required/></div><div className="form-group"><label htmlFor="edit-preco">Preço</label><input type="text" id="edit-preco" name="preco" value={editFormData.preco} onChange={handleEditFormChange} required/></div><div className="form-group"><label htmlFor="edit-quantidade">Quantidade</label><input type="text" id="edit-quantidade" name="quantidade" value={editFormData.quantidade} onChange={handleEditFormChange} required/></div><div className="form-group"><label htmlFor="edit-unidade">Unidade</label><select id="edit-unidade" name="unidade" value={editFormData.unidade} onChange={handleEditFormChange}><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option><option value="un">un</option></select></div><div className="modal-footer"><button type="submit" className="btn btn-primary">Salvar Alterações</button></div></form></div></div></div>)}
    </div>
  );
}

export default GerenciarInsumos;