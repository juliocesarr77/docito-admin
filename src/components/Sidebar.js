// src/components/Sidebar.js

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Home, FilePlus, ListChecks, Book, ChefHat, LogOut,
    Menu, X, Calculator, Wallet // Ícones adicionais para coerência e futuro
} from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Para o botão de logout
import './Sidebar.css'; // Estilos para a sidebar

function Sidebar() {
    const [isOpen, setIsOpen] = useState(false); // Estado para controlar se a sidebar está aberta/fechada em mobile
    const { logout } = useAuth(); // Função de logout do seu contexto de autenticação
    const location = useLocation(); // Para saber a rota atual e destacar o link ativo

    const handleLogout = async () => {
        try {
            await logout();
            // O useNavigate pode ser usado aqui se o logout não redirecionar automaticamente
            // Ou o AuthContext pode lidar com o redirecionamento globalmente
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            // Poderíamos usar um toast aqui para feedback de erro
        }
    };

    // Array de objetos para facilitar a renderização dos links
    const navLinks = [
        { name: "Painel", path: "/dashboard", icon: Home },
        { name: "Novo Pedido", path: "/novo-pedido", icon: FilePlus },
        { name: "Listar Pedidos", path: "/pedidos", icon: ListChecks },
        { name: "Gestão de Insumos", path: "/insumos", icon: Book },
        { name: "Fichas Técnicas", path: "/receitas", icon: ChefHat }, // Mantido o nome original da rota
        { name: "Precificação Detalhada", path: "/precificacao", icon: Calculator }, // Calculator é um bom ícone para precificação
        { name: "Fluxo de Caixa", path: "/fluxo-de-caixa", icon: Wallet }, // Wallet é mais adequado para fluxo de caixa
    ];

    return (
        <>
            {/* Botão Hamburger para Mobile */}
            <button className="hamburger-menu" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={30} /> : <Menu size={30} />}
            </button>

            {/* Overlay para Mobile quando a sidebar está aberta */}
            {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}

            <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Docito Admin</h2>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                <Link 
                                    to={link.path} 
                                    className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                                    onClick={() => setIsOpen(false)} // Fecha a sidebar ao clicar em um link em mobile
                                >
                                    <link.icon size={20} className="sidebar-icon" />
                                    <span>{link.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="sidebar-logout-btn">
                        <LogOut size={20} className="sidebar-icon" />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
