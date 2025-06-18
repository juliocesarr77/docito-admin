// src/pages/GerenciarReceitas.js (Agora "Catálogo de Produtos Precificados")

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { ChefHat, BookOpen, AlertTriangle, ArrowLeft, Trash2, Tag, DollarSign, Package, Scale, PlusCircle, Edit, PiggyBank } from 'lucide-react'; 

import './ProdutosPrecificados.css'; // OU './CatalogoProdutos.css'

// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

function GerenciarReceitas() {
    const [produtosPrecificados, setProdutosPrecificados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const { currentUser, db, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading || !currentUser || !db) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'produtosPrecificados'), orderBy('nome', 'asc')); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProdutosPrecificados(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Erro ao buscar produtos precificados:", err);
            setError("Falha ao carregar catálogo de produtos.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser, db, authLoading]);
    
    const handleDeleteProdutoPrecificado = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'produtosPrecificados', id));
            setConfirmDeleteId(null);
        } catch(err) {
            console.error("Erro ao deletar produto precificado:", err);
            setError("Ocorreu um erro ao deletar o produto.");
        }
    };

    if (authLoading || loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!currentUser) return <div className="p-8 text-center text-red-600 font-semibold">Erro: Você precisa estar logado.</div>;

    return (
        <div className="catalogo-container max-w-6xl mx-auto">
            {/* <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover /> */}
            <div className="catalogo-header">
                <Link to="/dashboard" className="btn-voltar"><ArrowLeft size={18}/>Voltar</Link>
                <h1 className="catalogo-header-title"><ChefHat size={32}/>Catálogo de Produtos Precificados</h1>
                <button onClick={() => navigate('/precificacao')} className="btn-primary">
                    <PlusCircle size={20}/> Criar Nova Precificação
                </button>
            </div>

            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

            {produtosPrecificados.length > 0 ? (
                <div className="produtos-grid">
                    {produtosPrecificados.map(produto => (
                        <div key={produto.id} className="produto-card">
                            <div className="produto-card-header">
                                <h3 className="produto-card-title">{produto.nome}</h3>
                                <div className="produto-card-actions">
                                    <button onClick={() => navigate(`/precificacao`, { state: { loadId: produto.idPrecificacao } })} className="btn-icon edit">
                                        <Edit size={18}/>
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(produto.id)} className="btn-icon delete">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                            <div className="produto-details">
                                <p><strong>Peso Total Receita:</strong> {produto.pesoTotalReceita}g</p>
                                <p><strong>Rendimento Final:</strong> {produto.rendimentoFinal} un.</p>

                                {produto.ingredientes && produto.ingredientes.length > 0 && (
                                    <ul className="ingredientes-list">
                                        <h4 className="ingredientes-list-title">Ingredientes Principais:</h4>
                                        {produto.ingredientes.map((ing, i) => (
                                            <li key={i}>- {ing.nome} ({ing.quantidade} {ing.unidade})</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            <div className="produto-valores">
                                <div className="produto-valor-item valor-custo-total">
                                    <span className="label"><DollarSign size={16}/> Custo Total:</span>
                                    <span className="value">{produto.custoTotalReceita?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                                <div className="produto-valor-item valor-custo-grama">
                                    <span className="label"><Scale size={16}/> Custo por Grama:</span>
                                    <span className="value">{produto.custoPorGrama?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/g</span>
                                </div>
                                <div className="produto-valor-item valor-preco-unidade">
                                    <span className="label"><Tag size={16}/> Preço Sugerido (Un):</span>
                                    <span className="value">{produto.precoPorUnidadeCalculado?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                                <div className="produto-valor-item valor-meu-preco">
                                    <span className="label"><Package size={16}/> Meu Preço (100un):</span>
                                    <span className="value">
                                        {/* CORREÇÃO AQUI: Converter para número antes de chamar toLocaleString */}
                                        {typeof produto.meusPrecos?.['pacote-100'] === 'number'
                                            ? produto.meusPrecos['pacote-100'].toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
                                            : (parseFloat(produto.meusPrecos?.['pacote-100']) || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
                                        }
                                    </span>
                                </div>
                                <div className="produto-valor-item valor-lucro-real">
                                    <span className="label"><PiggyBank size={16}/> Lucro (100un):</span>
                                    <span className="value">{produto.lucroRealTotal?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-produtos-message">
                    <BookOpen size={48}/>
                    <h3>Nenhum produto precificado</h3>
                    <p>Comece criando sua primeira precificação para vê-la aqui.</p>
                    <button onClick={() => navigate('/precificacao')} className="btn-primary">
                        <PlusCircle size={20}/>Ir para Precificação
                    </button>
                </div>
            )}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4">
                        <div className="text-center">
                            <AlertTriangle size={48} className="mx-auto text-yellow-500"/>
                            <h3 className="mt-4 text-xl font-bold text-gray-800">Confirmar Exclusão</h3>
                            <p className="mt-2 text-gray-600">Deseja realmente deletar este produto do catálogo?</p>
                            <p className="text-xs text-gray-400 mt-1">(A precificação original também será deletada.)</p>
                        </div>
                        <div className="mt-8 flex justify-center gap-4">
                            <button onClick={() => setConfirmDeleteId(null)} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                            <button onClick={() => handleDeleteProdutoPrecificado(confirmDeleteId)} className="py-2 px-6 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">Deletar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GerenciarReceitas;