import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '../types.ts';
import { useClients } from '../contexts.tsx';

interface SaveClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    onSuccess?: (client: Client) => void;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const SaveClientModal: React.FC<SaveClientModalProps> = ({
    isOpen,
    onClose,
    clientName,
    onSuccess
}) => {
    const { addClient } = useClients();
    const [whatsapp, setWhatsapp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const whatsappInputRef = React.useRef<HTMLInputElement>(null);

    // Focar no campo WhatsApp quando o modal abrir e bloquear scroll
    useEffect(() => {
        if (isOpen) {
            // Bloquear scroll do body
            document.body.style.overflow = 'hidden';
            
            // Focar no campo
            setTimeout(() => whatsappInputRef.current?.focus(), 100);
        } else {
            // Restaurar scroll
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Limpar formulário quando fechar
    useEffect(() => {
        if (!isOpen) {
            setWhatsapp('');
            setIsSubmitting(false);
            setErrorMessage('');
            setSuccessMessage('');
        }
    }, [isOpen]);

    // Formatar WhatsApp enquanto digita
    const formatWhatsApp = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) {
            return numbers ? `(${numbers}` : '';
        } else if (numbers.length <= 6) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length <= 10) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsapp(formatted);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        // Validar WhatsApp
        const numbers = whatsapp.replace(/\D/g, '');
        if (numbers.length < 10 || numbers.length > 11) {
            setErrorMessage('WhatsApp inválido. Por favor, informe um número válido com DDD.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const newClient = await addClient({
                fullName: clientName.trim(),
                whatsapp: whatsapp.trim(),
                nickname: undefined,
                observation: undefined,
                cpf: undefined,
            });

            // Mostrar mensagem de sucesso
            setSuccessMessage('Cliente salvo com sucesso!');
            
            // Aguardar um pouco e então chamar callback e fechar
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess(newClient);
                }
                onClose();
            }, 800);
        } catch (error: any) {
            console.error('Erro ao salvar cliente:', error);
            setErrorMessage('Erro ao salvar cliente. Tente novamente.');
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <>
            {/* Overlay */}
            <div 
                className="fixed bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={handleCancel}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto'
                }}
            >
                {/* Modal */}
                <div 
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        margin: 'auto'
                    }}
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Icon name="person_add" className="text-primary text-2xl" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Salvar Cliente
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Adicione informações para salvar na base
                                </p>
                            </div>
                            <button
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Icon name="close" className="text-xl" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5">
                        {/* Nome do Cliente (readonly) */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nome do Cliente
                            </label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {clientName}
                                </p>
                            </div>
                        </div>

                        {/* WhatsApp (obrigatório) */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                WhatsApp <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={whatsappInputRef}
                                type="text"
                                value={whatsapp}
                                onChange={handleWhatsAppChange}
                                onKeyDown={(e) => {
                                    // Permitir Enter para submeter
                                    if (e.key === 'Enter' && whatsapp.trim() && !isSubmitting) {
                                        e.preventDefault();
                                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                                        handleSubmit(fakeEvent);
                                    }
                                }}
                                placeholder="(87) 99155-6444"
                                maxLength={15}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                Informe o WhatsApp para contato
                            </p>
                        </div>

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                                <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-lg flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-800 dark:text-green-200 flex-1">{successMessage}</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                                <Icon name="error" className="text-red-600 dark:text-red-400 text-lg flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800 dark:text-red-200 flex-1">{errorMessage}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                                    handleSubmit(fakeEvent);
                                }}
                                disabled={isSubmitting || !whatsapp.trim()}
                                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check_circle" className="text-base" />
                                        <span>Salvar Cliente</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    // Renderizar usando Portal para garantir que apareça no topo da página
    return createPortal(modalContent, document.body);
};

