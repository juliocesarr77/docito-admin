// src/components/ConfirmationModal.js

import React from 'react';
import { AlertTriangle, X } from 'lucide-react'; // Ícones para o modal de alerta
import './ConfirmationModal.css'; // Estilos para o modal

/**
 * Componente genérico para modais de confirmação.
 * Substitui o window.confirm() por um modal estilizado.
 *
 * @param {object} props - Propriedades do componente.
 * @param {boolean} props.show - Controla a visibilidade do modal.
 * @param {string} props.title - Título do modal (ex: "Confirmar Exclusão").
 * @param {string} props.message - Mensagem principal para o usuário.
 * @param {function} props.onConfirm - Função a ser chamada quando o usuário confirma.
 * @param {function} props.onCancel - Função a ser chamada quando o usuário cancela ou fecha o modal.
 * @param {boolean} [props.isLoading=false] - Indica se uma ação está em progresso para desabilitar botões.
 * @param {string} [props.confirmText="Confirmar"] - Texto para o botão de confirmação.
 * @param {string} [props.cancelText="Cancelar"] - Texto para o botão de cancelamento.
 * @param {string} [props.iconType="warning"] - Tipo de ícone ('warning', 'info', 'success', 'error').
 */
function ConfirmationModal({ 
    show, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    isLoading = false,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    iconType = "warning"
}) {
    if (!show) {
        return null; // Não renderiza nada se não for para mostrar
    }

    let iconComponent;
    let iconColorClass;

    switch (iconType) {
        case 'warning':
            iconComponent = <AlertTriangle size={48} />;
            iconColorClass = 'text-yellow-500';
            break;
        // Você pode adicionar mais tipos de ícones aqui no futuro se precisar
        // case 'info': iconComponent = <Info size={48} />; iconColorClass = 'text-blue-500'; break;
        // case 'success': iconComponent = <CheckCircle size={48} />; iconColorClass = 'text-green-500'; break;
        // case 'error': iconComponent = <XCircle size={48} />; iconColorClass = 'text-red-500'; break;
        default:
            iconComponent = <AlertTriangle size={48} />;
            iconColorClass = 'text-yellow-500';
    }

    return (
        <div className="modal-backdrop-custom">
            <div className="modal-content-custom">
                <button onClick={onCancel} className="modal-close-btn-custom">
                    <X size={24} />
                </button>
                <div className={`modal-icon-container ${iconColorClass}`}>
                    {iconComponent}
                </div>
                <h3 className="modal-title-custom">{title}</h3>
                <p className="modal-message-custom">{message}</p>
                <div className="modal-actions-custom">
                    <button 
                        onClick={onCancel} 
                        className="btn-cancel-custom" 
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="btn-confirm-custom" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Aguarde...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;
