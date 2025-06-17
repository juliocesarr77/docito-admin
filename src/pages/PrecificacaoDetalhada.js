// src/pages/PrecificacaoDetalhada.js

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
// Ícones 100% limpos e revisados
import { ArrowLeft, PlusCircle, Trash2, HelpCircle, TrendingUp, TrendingDown, PieChart, FileText, Save, FilePlus, AlertTriangle, Scale, ShoppingBag } from 'lucide-react';
import './PrecificacaoDetalhada.css';

const initialState = {
    id: null,
    nome: 'Nova Precificação',
    ingredientes: [{ insumoId: '', qtdUsada: '' }],
    pctCustoFixo: 15,
    pctLucroGeral: 50,
    pctLucroEmpresa: 50,
    pesoTotalReceita: '',
    rendimentoManual: '',
    meusPrecos: {}
};

function PrecificacaoDetalhada() {
    const [insumosDisponiveis, setInsumosDisponiveis] = useState([]);
    const [precificacoesSalvas, setPrecificacoesSalvas] = useState([]);
    const [formState, setFormState] = useState(initialState);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const { currentUser, db, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !currentUser || !db) return;
        const insumosUnsub = onSnapshot(query(collection(db, 'insumos'), orderBy('nome', 'asc')), snapshot => {
            setInsumosDisponiveis(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const precificacoesUnsub = onSnapshot(query(collection(db, 'precificacoes'), orderBy('nome', 'asc')), snapshot => {
            setPrecificacoesSalvas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => { insumosUnsub(); precificacoesUnsub(); };
    }, [currentUser, db, authLoading]);

    const handleFormChange = (field, value) => setFormState(prev => ({ ...prev, [field]: value }));
    const handleIngredienteChange = (index, field, value) => {
        const novosIngredientes = [...formState.ingredientes];
        novosIngredientes[index][field] = value;
        if (field === 'insumoId') {
            novosIngredientes[index].dadosInsumo = insumosDisponiveis.find(i => i.id === value);
        }
        setFormState(prev => ({ ...prev, ingredientes: novosIngredientes }));
    };
    const adicionarLinhaIngrediente = () => setFormState(prev => ({ ...prev, ingredientes: [...prev.ingredientes, { insumoId: '', qtdUsada: '' }] }));
    const removerLinhaIngrediente = (index) => setFormState(prev => ({ ...prev, ingredientes: prev.ingredientes.filter((_, i) => i !== index) }));
    const handlePctEmpresaChange = (e) => handleFormChange('pctLucroEmpresa', Math.max(0, Math.min(100, Number(e.target.value))));
    const handlePrecoChange = (key, valor) => handleFormChange('meusPrecos', { ...formState.meusPrecos, [key]: valor });

    const handleSaveOrUpdate = async () => {
        if (!db || !formState.nome) { alert('Por favor, dê um nome para a sua precificação.'); return; }
        const dataToSave = { ...formState };
        delete dataToSave.id;

        if (formState.id) {
            await updateDoc(doc(db, 'precificacoes', formState.id), dataToSave);
        } else {
            const newDocRef = await addDoc(collection(db, 'precificacoes'), dataToSave);
            setFormState(prev => ({...prev, id: newDocRef.id}));
        }
        alert('Precificação salva com sucesso!');
    };

    const handleLoad = (id) => {
        const precificacaoCarregada = precificacoesSalvas.find(p => p.id === id);
        if (precificacaoCarregada) { setFormState({ ...initialState, ...precificacaoCarregada, id }); }
    };
    
    const handleDelete = async () => {
        if (!db || !confirmDeleteId) return;
        await deleteDoc(doc(db, 'precificacoes', confirmDeleteId));
        setConfirmDeleteId(null);
        handleNew();
    };

    const handleNew = () => setFormState(initialState);

    const calculos = useMemo(() => {
        const { ingredientes, pctCustoFixo, pctLucroGeral, pctLucroEmpresa, pesoTotalReceita, rendimentoManual, meusPrecos } = formState;
        
        const custoTotalReceita = ingredientes.reduce((total, ing) => {
            const insumoData = insumosDisponiveis.find(i => i.id === ing.insumoId);
            return total + ((insumoData?.custoPorUnidade || 0) * (parseFloat(ing.qtdUsada) || 0));
        }, 0);

        const valorCustoFixo = custoTotalReceita * ((parseFloat(pctCustoFixo) || 0) / 100);
        const custoProducao = custoTotalReceita + valorCustoFixo;
        
        const lucroSugerido = custoProducao * ((parseFloat(pctLucroGeral) || 0) / 100);
        const valorVendaSugerido = custoProducao + lucroSugerido;
        
        const rendimentoFinal = parseFloat(rendimentoManual) > 0 ? parseFloat(rendimentoManual) : Math.floor((parseFloat(pesoTotalReceita) || 0) / 13);
        const custoPorUnidade = rendimentoFinal > 0 ? custoProducao / rendimentoFinal : 0;
        
        const pacotes = [100, 50, 30, 15, 9, 4, 1];
        const tabelaPrecos = pacotes.map(quantidade => {
            let fatorDesconto = 1.0;
            if (quantidade >= 100) fatorDesconto = 0.90; else if (quantidade >= 50) fatorDesconto = 0.95; else if (quantidade >= 30) fatorDesconto = 0.98;
            
            const precoSugerido = (custoPorUnidade * (1 + (parseFloat(pctLucroGeral) / 100))) * quantidade * fatorDesconto;
            const custoDoPacote = custoPorUnidade * quantidade;
            return { quantidade, custoDoPacote, precoSugerido };
        });

        const meuPrecoCento = parseFloat(meusPrecos['pacote-100']) || 0;
        const custoCento = tabelaPrecos.find(p => p.quantidade === 100)?.custoDoPacote || 0;
        const lucroRealTotal = meuPrecoCento > 0 ? meuPrecoCento - custoCento : 0;
        const lucroRealEmpresa = lucroRealTotal * ((parseFloat(pctLucroEmpresa) || 0) / 100);
        const lucroRealSalario = lucroRealTotal - lucroRealEmpresa;

        return { custoTotalReceita, valorCustoFixo, custoProducao, lucroSugerido, tabelaPrecos, lucroRealTotal, lucroRealEmpresa, lucroRealSalario, valorVendaSugerido, custoPorUnidade };
    }, [formState, insumosDisponiveis]);

    if (authLoading || loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="precificacao-container">
            <header className="precificacao-header"><h1><FileText /> Engenharia de Cardápio</h1><Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800"><ArrowLeft size={18} className="mr-2"/>Voltar</Link></header>
            <div className="precificacao-grid">
                <div className="space-y-6">
                    <div className="card">
                        <div className="card-header"><h2 className="card-title">Projetos de Precificação</h2><button onClick={handleNew} className="text-sm font-semibold text-indigo-600 flex items-center gap-1"><FilePlus size={16}/>Novo</button></div>
                        <ul className="saved-list card-content">{precificacoesSalvas.map(p => (<li key={p.id} className="saved-list-item"><span onClick={() => handleLoad(p.id)} className="saved-list-item-name flex-grow">{p.nome}</span><button onClick={() => setConfirmDeleteId(p.id)} className="text-gray-400 hover:text-red-500 ml-4"><Trash2 size={16}/></button></li>))}</ul>
                    </div>
                    <div className="card">
                        <div className="card-header"><h2 className="card-title">Registro de Insumos</h2><button onClick={handleSaveOrUpdate} className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md flex items-center gap-1"><Save size={16}/>{formState.id ? 'Atualizar' : 'Salvar'}</button></div>
                        <div className="card-content"><input type="text" value={formState.nome} onChange={e => handleFormChange('nome', e.target.value)} placeholder="Nome da Precificação" className="text-lg font-semibold w-full border-b-2 p-2 mb-4"/>
                            <table className="insumos-table"><thead><tr><th>Insumo</th><th>Qtd. Usada</th><th>Custo</th><th></th></tr></thead><tbody>{formState.ingredientes.map((ing, index) => {const insumoData = insumosDisponiveis.find(i => i.id === ing.insumoId); const custoLinha = (insumoData?.custoPorUnidade || 0) * (parseFloat(ing.qtdUsada) || 0); return (<tr key={index}><td className="w-3/5"><select value={ing.insumoId} onChange={e => handleIngredienteChange(index, 'insumoId', e.target.value)}><option value="">Selecione...</option>{insumosDisponiveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></td><td className="w-1/5"><input type="number" value={ing.qtdUsada} onChange={e => handleIngredienteChange(index, 'qtdUsada', e.target.value)} placeholder="0"/></td><td><input type="text" value={custoLinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} readOnly/></td><td><button onClick={() => removerLinhaIngrediente(index)} className="remove-btn"><Trash2 size={16}/></button></td></tr>)})}</tbody></table>
                            <button onClick={adicionarLinhaIngrediente} className="add-btn"><PlusCircle size={16} className="mr-2"/>Adicionar Insumo</button>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="card-title">Custos e Sugestão de Preço</h2>
                        <div className="card-content custo-section">
                            <div className="linha-calculo"><p className="label"><ShoppingBag size={14}/> Custo dos Insumos</p><p className="valor">{calculos.custoTotalReceita.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                            <div className="linha-calculo"><label className="label"><HelpCircle size={14}/> Custos Fixos/Variáveis</label><div className="input-group"><input type="number" value={formState.pctCustoFixo} onChange={e => handleFormChange('pctCustoFixo', e.target.value)}/><span className="text-gray-500">%</span></div></div>
                            <div className="linha-calculo linha-total"><p className="label">Custo Total de Produção</p><p className="valor">{calculos.custoProducao.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                            <div className="linha-calculo"><label className="label"><PieChart size={14}/> Margem de Lucro Sugerida</label><div className="input-group"><input type="number" value={formState.pctLucroGeral} onChange={e => handleFormChange('pctLucroGeral', e.target.value)}/><span className="text-gray-500">%</span></div></div>
                            <div className="linha-calculo linha-destaque text-blue-600 !text-lg"><p>Preço de Venda Sugerido (Receita)</p><p>{calculos.valorVendaSugerido.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                        </div>
                    </div>
                    <div className="card">
                        <h2 className="card-title">Análise de Lucro REAL</h2>
                        <div className="card-content custo-section">
                            <div className="linha-calculo"><p className="label">Baseado no seu preço do <strong className="text-indigo-600">CENTO</strong></p><p className="valor text-green-600">{calculos.lucroRealTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                            <div><label className="label text-sm">Divisão do Lucro Real:</label><input type="range" min="0" max="100" value={formState.pctLucroEmpresa} onChange={handlePctEmpresaChange} className="w-full mt-2"/></div>
                            <div className="flex justify-between text-center mt-1">
                                <div><p className="text-xs text-gray-500">Empresa ({formState.pctLucroEmpresa}%)</p><p className="font-bold text-green-700">{calculos.lucroRealEmpresa.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                                <div><p className="text-xs text-gray-500">Salário ({100 - formState.pctLucroEmpresa}%)</p><p className="font-bold text-green-700">{calculos.lucroRealSalario.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <h2 className="card-title">Tabela de Venda</h2>
                        <div className="card-content">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><label className="text-sm font-medium">Peso Total da Massa (g)</label><input type="number" value={formState.pesoTotalReceita} onChange={e => handleFormChange('pesoTotalReceita', e.target.value)} className="w-full p-1.5 border rounded-md mt-1"/></div>
                                <div><label className="text-sm font-medium">Rendimento Final (un)</label><input type="number" value={formState.rendimentoManual} onChange={e => handleFormChange('rendimentoManual', e.target.value)} className="w-full p-1.5 border rounded-md mt-1" placeholder="Automático"/></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="sugestao-table">
                                    <thead><tr><th>Pacote</th><th>Preço Sugerido</th><th>Meu Preço</th><th>Lucro/Prejuízo</th></tr></thead>
                                    <tbody>
                                        {calculos.tabelaPrecos.map(item => {
                                            const chavePreco = `pacote-${item.quantidade}`;
                                            const meuPreco = parseFloat(formState.meusPrecos[chavePreco]) || 0;
                                            const lucro = meuPreco - item.custoDoPacote;
                                            return (
                                                <tr key={item.quantidade}>
                                                    <td className="font-medium">{item.quantidade} un.</td>
                                                    <td className="preco-sugerido">{item.precoSugerido.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                                    <td><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">R$</span><input type="number" className="pl-8 w-28 border rounded-md p-1.5" value={formState.meusPrecos[chavePreco] || ''} onChange={(e) => handlePrecoChange(chavePreco, e.target.value)}/></div></td>
                                                    <td className={meuPreco > 0 ? (lucro >= 0 ? 'lucro-positivo' : 'lucro-negativo') : 'text-gray-400'}>{meuPreco > 0 ? lucro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {confirmDeleteId && (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4"><div className="text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500"/><h3 className="mt-4 text-xl font-bold text-gray-800">Confirmar Exclusão</h3><p className="mt-2 text-gray-600">Deseja deletar este projeto?</p></div><div className="mt-8 flex justify-center gap-4"><button onClick={() => setConfirmDeleteId(null)} className="py-2 px-6 bg-gray-300 rounded-md">Cancelar</button><button onClick={handleDelete} className="py-2 px-6 bg-red-600 text-white rounded-md">Deletar</button></div></div></div>)}
        </div>
    );
}

export default PrecificacaoDetalhada;