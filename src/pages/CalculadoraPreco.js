// src/pages/CalculadoraPreco.js

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Clock, Hash, ShoppingBag, TrendingUp, TrendingDown, Scale } from 'lucide-react';

function CalculadoraPreco() {
    const [receitas, setReceitas] = useState([]);
    const [receitaSelecionadaId, setReceitaSelecionadaId] = useState('');
    
    // Parâmetros de Custo
    const [valorHora, setValorHora] = useState('15');
    const [tempoGasto, setTempoGasto] = useState('');
    const [unidadeTempo, setUnidadeTempo] = useState('minutos');
    const [percentualCustos, setPercentualCustos] = useState('25');
    const [markup, setMarkup] = useState('3');
    
    // Estado para guardar os preços de venda do usuário
    const [meusPrecos, setMeusPrecos] = useState({});

    const [loading, setLoading] = useState(true);
    const { currentUser, db, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !currentUser || !db) {
            setLoading(false);
            return;
        }
        
        const q = query(collection(db, 'receitas'), orderBy('nome', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReceitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser, db, authLoading]);

    // Lógica principal de cálculo
    const calculos = useMemo(() => {
        const receita = receitas.find(r => r.id === receitaSelecionadaId);
        if (!receita || !receita.pesoTotal) return null;

        const tempoEmHoras = unidadeTempo === 'horas' ? (parseFloat(tempoGasto) || 0) : (parseFloat(tempoGasto) || 0) / 60;
        const custoMaoDeObra = (parseFloat(valorHora) || 0) * tempoEmHoras;
        const subtotalCusto = receita.custoTotal + custoMaoDeObra;
        const valorCustosInvisiveis = subtotalCusto * ((parseFloat(percentualCustos) || 0) / 100);
        const custoProducaoTotal = subtotalCusto + valorCustosInvisiveis;
        const mk = parseFloat(markup) || 1;

        const pesosDocinho = [13, 14, 15, 20];
        const pacotes = [100, 50, 30, 15, 9, 4, 1];

        // Gera uma análise completa para cada peso de docinho
        const analisePorPeso = pesosDocinho.map(peso => {
            const rendimentoTotalReceita = Math.floor(receita.pesoTotal / peso);
            if (rendimentoTotalReceita === 0) return null;

            const custoPorUnidade = custoProducaoTotal / rendimentoTotalReceita;
            
            const tabelaPacotes = pacotes.map(quantidade => {
                // CORREÇÃO: Removemos a verificação que limitava a quantidade ao rendimento.
                // Agora ele calcula para todos os pacotes.
                let fatorDesconto = 1.0;
                if (quantidade >= 100) fatorDesconto = 0.90; // 10% de desconto no preço final do cento
                else if (quantidade >= 50) fatorDesconto = 0.95; // 5% de desconto para 50
                else if (quantidade >= 30) fatorDesconto = 0.98; // 2% para 30

                const custoDoPacote = custoPorUnidade * quantidade;
                const precoSugerido = (custoPorUnidade * mk) * quantidade * fatorDesconto;
                
                return { quantidade, custoDoPacote, precoSugerido };
            }).filter(Boolean); // Apenas para garantir que nenhum item nulo passe

            return { peso, rendimentoTotal: rendimentoTotalReceita, tabelaPacotes };
        }).filter(Boolean);

        return {
            custoIngredientes: receita.custoTotal,
            custoMaoDeObra,
            valorCustosInvisiveis,
            custoProducaoTotal,
            analisePorPeso
        };
    }, [receitaSelecionadaId, receitas, valorHora, tempoGasto, unidadeTempo, percentualCustos, markup]);

    const handlePrecoChange = (key, valor) => {
        setMeusPrecos(prev => ({ ...prev, [key]: valor }));
    };

    if (authLoading || loading) return <div className="p-8 text-center">Carregando...</div>;
    
    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6"><ArrowLeft size={18} className="mr-2"/>Voltar</Link>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-8"><DollarSign size={32} className="mr-3 text-green-600"/>Calculadora e Análise de Preços</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna de Entradas */}
                    <div className="lg:col-span-1 bg-white p-8 rounded-lg shadow-md self-start">
                        <h2 className="text-xl font-semibold text-gray-700 mb-6">Parâmetros da Produção</h2>
                        <div className="space-y-4">
                           <div>
                                <label className="block text-sm font-medium text-gray-600">Selecione a Receita</label>
                                <select value={receitaSelecionadaId} onChange={e => setReceitaSelecionadaId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"><option value="">-- Escolha uma ficha --</option>{receitas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Seu salário por hora (R$)</label>
                                <input type="number" value={valorHora} onChange={e => setValorHora(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Ex: 15"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Tempo gasto na receita</label>
                                <div className="flex gap-2 mt-1"><input type="number" value={tempoGasto} onChange={e => setTempoGasto(e.target.value)} className="block w-full px-3 py-2 border rounded-md" placeholder="Ex: 90"/><select value={unidadeTempo} onChange={e => setUnidadeTempo(e.target.value)} className="block w-auto px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"><option value="minutos">Minutos</option><option value="horas">Horas</option></select></div>
                            </div>
                            <hr/>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Acréscimo (%) para Custos Invisíveis</label>
                                <input type="number" value={percentualCustos} onChange={e => setPercentualCustos(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Ex: 25"/>
                            </div>
                            <hr/>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Markup (Multiplicador)</label>
                                <input type="number" value={markup} onChange={e => setMarkup(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Ex: 3"/>
                            </div>
                        </div>
                    </div>

                    {/* Coluna de Resultados */}
                    <div className="lg:col-span-2 space-y-8">
                        {!calculos ? (<div className="bg-white p-8 rounded-lg shadow-md text-center py-10"><p className="text-gray-500">Selecione uma receita para começar.</p></div>) : (
                            <>
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Resumo de Custos</h2>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <div className="flex justify-between p-2 bg-gray-50 rounded-md"><span><ShoppingBag size={14} className="inline mr-2"/>Custo Ingredientes:</span><span className="font-bold">{calculos.custoIngredientes.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span></div>
                                        <div className="flex justify-between p-2 bg-gray-50 rounded-md"><span><Clock size={14} className="inline mr-2"/>Custo Mão de Obra:</span><span className="font-bold">{calculos.custoMaoDeObra.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span></div>
                                        <div className="flex justify-between p-2 bg-gray-50 rounded-md"><span><Hash size={14} className="inline mr-2"/>Custos Invisíveis ({percentualCustos}%):</span><span className="font-bold">{calculos.valorCustosInvisiveis.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span></div>
                                        <div className="flex justify-between p-3 bg-blue-100 rounded-md text-blue-900 mt-2">
                                            <span className="font-semibold">Custo Total da Receita:</span>
                                            <span className="font-bold text-lg">{calculos.custoProducaoTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {calculos.analisePorPeso.map(analise => (
                                <div key={analise.peso} className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><Scale size={20} className="mr-2 text-indigo-600"/>Análise para Doces de {analise.peso}g <span className="text-sm text-gray-500 ml-2">(1 Receita rende ~{analise.rendimentoTotal} unidades)</span></h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead className="bg-gray-100"><tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pacote</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preço Sugerido</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meu Preço</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lucro/Prejuízo</th>
                                            </tr></thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {analise.tabelaPacotes.map(item => {
                                                    const chavePreco = `${analise.peso}-${item.quantidade}`;
                                                    const meuPreco = parseFloat(meusPrecos[chavePreco]) || 0;
                                                    const lucro = meuPreco - item.custoDoPacote;
                                                    return (
                                                        <tr key={item.quantidade}>
                                                            <td className="px-3 py-3 font-medium text-gray-800">{item.quantidade} un.</td>
                                                            <td className="px-3 py-3 text-blue-600 font-semibold">{item.precoSugerido.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                                            <td className="px-3 py-3"><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">R$</span><input type="number" className="pl-8 w-28 border border-gray-300 rounded-md p-1.5 focus:ring-indigo-500 focus:border-indigo-500" placeholder="0,00" value={meusPrecos[chavePreco] || ''} onChange={(e) => handlePrecoChange(chavePreco, e.target.value)}/></div></td>
                                                            <td className="px-3 py-3 font-bold text-base">{meuPreco > 0 ? (<span className={lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{lucro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}{lucro >= 0 ? <TrendingUp size={16} className="inline ml-1"/> : <TrendingDown size={16} className="inline ml-1"/>}</span>) : (<span className="text-gray-400">-</span>)}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CalculadoraPreco;