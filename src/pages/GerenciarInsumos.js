// src/pages/GerenciarInsumos.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowLeft, Edit, X } from 'lucide-react';

function GerenciarInsumos() {
  // Estados para o formulário de NOVO insumo
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('g');

  // Estados gerais da página
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Estados para o modal de EDIÇÃO
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [editFormData, setEditFormData] = useState({ nome: '', preco: '', quantidade: '', unidade: '' });

  const { currentUser, db, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !currentUser || !db) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
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
        nome,
        preco: precoFloat,
        quantidade: quantidadeFloat,
        unidade,
        custoPorUnidade: precoFloat / quantidadeFloat,
        createdAt: new Date(),
      });

      setNome(''); setPreco(''); setQuantidade(''); setUnidade('g');
      setSuccessMessage('Insumo cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error("Erro ao adicionar insumo: ", err);
      setError('Ocorreu um erro ao salvar.');
    }
  };

  const handleDelete = async (id) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "insumos", id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Erro ao deletar insumo:", err);
      setError("Ocorreu um erro ao deletar.");
    }
  };

  const openEditModal = (insumo) => {
    setEditingInsumo(insumo);
    setEditFormData({
        nome: insumo.nome,
        preco: insumo.preco.toString(),
        quantidade: insumo.quantidade.toString(),
        unidade: insumo.unidade,
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
            nome: editFormData.nome,
            preco: precoFloat,
            quantidade: quantidadeFloat,
            unidade: editFormData.unidade,
            custoPorUnidade: precoFloat / quantidadeFloat,
        };

        await updateDoc(doc(db, "insumos", editingInsumo.id), updatedData);
        
        setEditingInsumo(null);
        setSuccessMessage('Insumo atualizado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
        console.error("Erro ao atualizar insumo:", err);
        setError("Ocorreu um erro ao atualizar o insumo.");
    }
  };
  
  if (authLoading) return <div className="p-8 text-center">Carregando autenticação...</div>;
  if (!currentUser) return <div className="p-8 text-center text-red-600 font-semibold">Erro: Você precisa estar logado para acessar esta página.</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
            <ArrowLeft size={18} className="mr-2"/>
            Voltar para o Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestão de Insumos</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Cadastrar Novo Insumo</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2"><label htmlFor="nome" className="block text-sm font-medium text-gray-600">Nome do Produto</label><input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md" placeholder="Ex: Leite Condensado" required/></div>
              <div><label htmlFor="preco" className="block text-sm font-medium text-gray-600">Preço Pago (R$)</label><input type="text" id="preco" value={preco} onChange={(e) => setPreco(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md" placeholder="Ex: 6,50" required/></div>
              <div><label htmlFor="quantidade" className="block text-sm font-medium text-gray-600">Quantidade</label><input type="text" id="quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md" placeholder="Ex: 395" required/></div>
              <div className="md:col-span-2"><label htmlFor="unidade" className="block text-sm font-medium text-gray-600">Unidade de Medida</label><select id="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md"><option value="g">Grama (g)</option><option value="kg">Quilograma (kg)</option><option value="ml">Mililitro (ml)</option><option value="l">Litro (l)</option><option value="un">Unidade (un)</option></select></div>
              <div className="md:col-span-2 flex items-end"><button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700">Salvar Insumo</button></div>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {successMessage && <p className="text-green-500 mt-4">{successMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-700 p-6">Insumos Cadastrados</h2>
            {loading ? ( <p className="p-6">Carregando...</p> ) : insumos.length === 0 ? ( <p className="p-6 text-gray-500">Nenhum insumo cadastrado.</p> ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo Unitário</th>
                        {/* Nova Coluna Adicionada */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor da Compra</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {insumos.map((insumo) => (
                        <tr key={insumo.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{insumo.nome}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{(insumo.custoPorUnidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} / {insumo.unidade}</td>
                        {/* Novo Dado da Tabela Adicionado */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(insumo.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({insumo.quantidade} {insumo.unidade})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                            <button onClick={() => openEditModal(insumo)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button>
                            <button onClick={() => setConfirmDeleteId(insumo.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
      </div>
       {confirmDeleteId && (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4"><div className="text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500"/><h3 className="mt-4 text-xl font-bold text-gray-800">Confirmar Exclusão</h3><p className="mt-2 text-gray-600">Você tem certeza?</p></div><div className="mt-8 flex justify-center gap-4"><button onClick={() => setConfirmDeleteId(null)} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button><button onClick={() => handleDelete(confirmDeleteId)} className="py-2 px-6 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">Deletar</button></div></div></div>)}

       {editingInsumo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full mx-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Editar Insumo</h3>
                        <button onClick={() => setEditingInsumo(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleUpdateInsumo} className="space-y-4">
                        <div><label htmlFor="edit-nome" className="block text-sm font-medium text-gray-600">Nome do Produto</label><input type="text" id="edit-nome" name="nome" value={editFormData.nome} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required/></div>
                        <div><label htmlFor="edit-preco" className="block text-sm font-medium text-gray-600">Preço Pago (R$)</label><input type="text" id="edit-preco" name="preco" value={editFormData.preco} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required/></div>
                        <div><label htmlFor="edit-quantidade" className="block text-sm font-medium text-gray-600">Quantidade</label><input type="text" id="edit-quantidade" name="quantidade" value={editFormData.quantidade} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required/></div>
                        <div><label htmlFor="edit-unidade" className="block text-sm font-medium text-gray-600">Unidade de Medida</label><select id="edit-unidade" name="unidade" value={editFormData.unidade} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border rounded-md"><option value="g">Grama (g)</option><option value="kg">Quilograma (kg)</option><option value="ml">Mililitro (ml)</option><option value="l">Litro (l)</option><option value="un">Unidade (un)</option></select></div>
                        <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700">Salvar Alterações</button></div>
                    </form>
                </div>
            </div>
       )}
    </div>
  );
}

export default GerenciarInsumos;