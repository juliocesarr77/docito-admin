// src/layouts/MainLayout.js

import React from 'react';
import Sidebar from '../components/Sidebar'; // Importa a nova Sidebar
import { Outlet } from 'react-router-dom'; // Usado para renderizar o componente filho da rota
import './MainLayout.css'; // Estilos para o layout

function MainLayout() {
    return (
        <div className="main-layout">
            <Sidebar /> {/* Renderiza a Sidebar */}
            <main className="main-content">
                <Outlet /> {/* Renderiza o componente da rota atual aqui */}
            </main>
        </div>
    );
}

export default MainLayout;
