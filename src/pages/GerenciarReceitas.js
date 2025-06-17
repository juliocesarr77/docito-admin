// src/pages/GerenciarReceitas.js

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2, Save, X, BookOpen, ChefHat, AlertTriangle, ArrowLeft, Edit } from 'lucide-react';

function GerenciarReceitas() {
    // Estados para as listas
    const [receitas, setReceitas] = useState([]);
    const [insumos, setInsumos] = useState([]);
    
    // Estados para o formulário
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [nomeReceita, setNomeReceita] = useState('');
    const [pesoTotal, setPesoTotal] = useState(''); // Alterado de "rendimento" para "pesoTotal"
    const [ingredientesDaReceita, setIngredientesDaReceita] = useState([]);
    const [editingReceita, setEditingReceita] = useState(null); // NOVO: Guarda a receita que está sendo editada

    // Estados para adicionar ingredientes
    const [insumoSelecionadoId, setInsumoSelecionadoId] = useState('');
    const [quantidadeInsumo, setQuantidadeInsumo] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const { currentUser, db, loading: authLoading } = useAuth();

    // Efeito para carregar insumos e receitas
    useEffect(() => {
        if (authLoading || !currentUser || !db) {
            setLoading(false);
            return;
        }

        const fetchInsumos = async () => {
            const insumosSnapshot = await getDocs(collection(db, 'insumos'));
            setInsumos(insumosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        const subscribeReceitas = () => {
            const q = query(collection(db, 'receitas'), orderBy('createdAt', 'desc'));
            return onSnapshot(q, (snapshot) => {
                setReceitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }, (err) => {
                console.error("Erro ao buscar receitas:", err);
                setError("Falha ao carregar fichas técnicas.");
                setLoading(false);
            });
        };

        fetchInsumos();
        const unsubscribe = subscribeReceitas();
        return () => unsubscribe();
    }, [currentUser, db, authLoading]);
    
    // NOVO: Efeito para preencher o formulário quando o modo de edição é ativado
    useEffect(() => {
        if (editingReceita) {
            setNomeReceita(editingReceita.nome);
            setPesoTotal(editingReceita.pesoTotal); // Usando pesoTotal
            setIngredientesDaReceita(editingReceita.ingredientes);
            setIsFormVisible(true);
        }
    }, [editingReceita]);

    const handleAddIngrediente = () => {
        if (!insumoSelecionadoId || !quantidadeInsumo) {
            setError('Selecione um insumo e informe a quantidade.');
            return;
        }
        const insumo = insumos.find(i => i.id === insumoSelecionadoId);
        if (!insumo) return;
        
        const custoIngrediente = insumo.custoPorUnidade * parseFloat(quantidadeInsumo);
        const novoIngrediente = {
            insumoId: insumo.id, nome: insumo.nome, quantidade: parseFloat(quantidadeInsumo), unidade: insumo.unidade, custo: custoIngrediente
        };
        
        setIngredientesDaReceita([...ingredientesDaReceita, novoIngrediente]);
        setInsumoSelecionadoId('');
        setQuantidadeInsumo('');
        setError('');
    };

    const handleRemoveIngrediente = (index) => {
        setIngredientesDaReceita(ingredientesDaReceita.filter((_, i) => i !== index));
    };
    
    const custoTotalDaNovaReceita = useMemo(() => {
        return ingredientesDaReceita.reduce((total, ing) => total + ing.custo, 0);
    }, [ingredientesDaReceita]);
    
    const resetForm = () => {
        setNomeReceita('');
        setPesoTotal('');
        setIngredientesDaReceita([]);
        setIsFormVisible(false);
        setEditingReceita(null);
        setError('');
    };

    // Função agora salva uma nova receita ou atualiza uma existente
    const handleSaveOrUpdateReceita = async () => {
        if (!nomeReceita || !pesoTotal || ingredientesDaReceita.length === 0) {
            setError("Preencha o nome, peso total e adicione pelo menos um ingrediente.");
            return;
        }
        
        const receitaData = {
            nome: nomeReceita,
            pesoTotal: parseFloat(pesoTotal),
            ingredientes: ingredientesDaReceita,
            custoTotal: custoTotalDaNovaReceita,
            createdAt: editingReceita ? editingReceita.createdAt : new Date() // Mantém a data original na edição
        };

        try {
            if (editingReceita) {
                // Atualiza um documento existente
                const receitaRef = doc(db, 'receitas', editingReceita.id);
                await updateDoc(receitaRef, receitaData);
            } else {
                // Adiciona um novo documento
                await addDoc(collection(db, 'receitas'), receitaData);
            }
            resetForm();
        } catch (err) {
            console.error("Erro ao salvar/atualizar receita:", err);
            setError("Ocorreu um erro ao salvar a ficha técnica.");
        }
    };

    const handleDeleteReceita = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'receitas', id));
            setConfirmDeleteId(null);
        } catch(err) {
            console.error("Erro ao deletar receita:", err);
            setError("Ocorreu um erro ao deletar a ficha técnica.");
        }
    };

    const handleEditClick = (receita) => {
        setEditingReceita(receita);
    };

    if (authLoading || loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!currentUser) return <div className="p-8 text-center text-red-600 font-semibold">Erro: Você precisa estar logado.</div>;

    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6"><ArrowLeft size={18} className="mr-2"/>Voltar</Link>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center"><ChefHat size={32} className="mr-3 text-indigo-600"/>Fichas Técnicas</h1>
                    {!isFormVisible && (<button onClick={() => setIsFormVisible(true)} className="flex items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700"><PlusCircle size={20} className="mr-2"/> Nova Ficha</button>)}
                </div>

                {isFormVisible && (
                    <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-700">{editingReceita ? "Editando Ficha Técnica" : "Criar Nova Ficha"}</h2>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <input type="text" placeholder="Nome da Receita" value={nomeReceita} onChange={e => setNomeReceita(e.target.value)} className="md:col-span-2 mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                            <input type="number" placeholder="Peso Total da Massa (g)" value={pesoTotal} onChange={e => setPesoTotal(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                             <h3 className="text-lg font-medium text-gray-600 mb-3">Adicionar Ingrediente</h3>
                             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                 <select value={insumoSelecionadoId} onChange={e => setInsumoSelecionadoId(e.target.value)} className="md:col-span-2 mt-1 block w-full px-3 py-2 bg-white border rounded-md"><option value="">Selecione um insumo...</option>{insumos.map(i => (<option key={i.id} value={i.id}>{i.nome}</option>))}</select>
                                 <input type="number" placeholder={`Qtd. (${insumos.find(i=>i.id===insumoSelecionadoId)?.unidade || ''})`} value={quantidadeInsumo} onChange={e => setQuantidadeInsumo(e.target.value)} className="md:col-span-2 mt-1 block w-full px-3 py-2 bg-white border rounded-md"/>
                                 <button onClick={handleAddIngrediente} className="bg-green-500 text-white rounded-md p-2 hover:bg-green-600 flex justify-center items-center"><PlusCircle size={20}/></button>
                             </div>
                        </div>
                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-600 mb-3">Ingredientes da Receita</h3>
                            <ul className="divide-y divide-gray-200">{ingredientesDaReceita.map((ing, index) => (<li key={index} className="py-3 flex justify-between items-center"><div><p className="font-medium text-gray-800">{ing.nome}</p><p className="text-sm text-gray-500">{ing.quantidade} {ing.unidade} - Custo: {ing.custo.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div><button onClick={() => handleRemoveIngrediente(index)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button></li>))}{ingredientesDaReceita.length === 0 && <p className="text-gray-400 text-sm">Nenhum ingrediente adicionado.</p>}</ul>
                        </div>
                        <div className="mt-8 flex justify-between items-center border-t pt-6">
                            <div className="text-xl font-bold text-gray-800">Custo Total: <span className="text-indigo-600 ml-2">{custoTotalDaNovaReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            <button onClick={handleSaveOrUpdateReceita} className="flex items-center bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700"><Save size={20} className="mr-2"/>{editingReceita ? 'Atualizar Ficha' : 'Salvar Ficha'}</button>
                        </div>
                        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receitas.map(receita => (
                        <div key={receita.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col">
                            <div className="flex-grow">
                                <div className="flex justify-between items-start"><h3 className="text-xl font-bold text-gray-800 mb-2">{receita.nome}</h3><div className="flex gap-2"><button onClick={() => handleEditClick(receita)} className="text-gray-400 hover:text-blue-500"><Edit size={18}/></button><button onClick={() => setConfirmDeleteId(receita.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button></div></div>
                                <p className="text-sm text-gray-500 mb-4">Peso Total: {receita.pesoTotal}g</p>
                                <ul className="text-sm mb-4 space-y-1">{receita.ingredientes.map((ing, i) => <li key={i} className="text-gray-600">- {ing.nome} ({ing.quantidade} {ing.unidade})</li>)}</ul>
                            </div>
                            <div className="border-t mt-auto pt-4"><div className="flex justify-between items-center"><span className="font-semibold text-gray-700">Custo Total:</span><span className="font-bold text-lg text-indigo-700">{receita.custoTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span></div></div>
                        </div>
                    ))}
                </div>

                 {!loading && receitas.length === 0 && !isFormVisible && (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md"><BookOpen size={48} className="mx-auto text-gray-300"/><h3 className="mt-4 text-xl font-medium text-gray-800">Nenhuma ficha técnica</h3><p className="mt-2 text-gray-500">Comece cadastrando sua primeira receita.</p><button onClick={() => setIsFormVisible(true)} className="mt-6 flex items-center mx-auto bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700"><PlusCircle size={20} className="mr-2"/>Criar Primeira</button></div>
                 )}
            </div>
            {confirmDeleteId && (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4"><div className="text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500"/><h3 className="mt-4 text-xl font-bold text-gray-800">Confirmar Exclusão</h3><p className="mt-2 text-gray-600">Deseja realmente deletar esta ficha?</p></div><div className="mt-8 flex justify-center gap-4"><button onClick={() => setConfirmDeleteId(null)} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button><button onClick={() => handleDeleteReceita(confirmDeleteId)} className="py-2 px-6 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">Deletar</button></div></div></div>)}
        </div>
    );
}

export default GerenciarReceitas;