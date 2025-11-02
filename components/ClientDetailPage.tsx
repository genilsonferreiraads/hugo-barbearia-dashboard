import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClients } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';
import { useState } from 'react';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const ClientDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { clients, deleteClient } = useClients();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const client = clients.find(c => c.id === Number(id));

    const handleEdit = () => {
        if (client) {
            navigate(`/clients/edit/${client.id}`);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!client) return;

        try {
            await deleteClient(client.id);
            setToast({ message: 'Cliente excluído com sucesso!', type: 'success' });
            setShowDeleteModal(false);
            setTimeout(() => {
                navigate('/clients');
            }, 1000);
        } catch (error: any) {
            setToast({ 
                message: `Erro ao excluir cliente: ${error.message || 'Erro desconhecido'}`, 
                type: 'error' 
            });
        }
    };

    if (!client) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icon name="error" className="text-4xl sm:text-6xl text-gray-400 dark:text-gray-600 mb-3 sm:mb-4" />
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                        Cliente não encontrado
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 px-4">
                        O cliente que você está procurando não existe.
                    </p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm sm:text-base"
                    >
                        Voltar para Clientes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-8">
                    <button
                        onClick={() => navigate('/clients')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 sm:mb-4 transition-colors text-sm sm:text-base"
                    >
                        <Icon name="arrow_back" className="text-lg sm:text-xl" />
                        <span>Voltar para Clientes</span>
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-2 sm:p-4 bg-primary/10 rounded-lg sm:rounded-xl">
                                <Icon name="person" className="text-primary text-2xl sm:text-3xl" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                                    {client.fullName}
                                </h1>
                                {client.nickname && (
                                    <p className="text-sm sm:text-lg text-gray-500 dark:text-gray-400">
                                        "{client.nickname}"
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-2">
                            <button
                                onClick={handleEdit}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                            >
                                <Icon name="edit" className="text-base sm:text-lg" />
                                <span>Editar</span>
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                            >
                                <Icon name="delete" className="text-base sm:text-lg" />
                                <span>Excluir</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Informações do Cliente */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Informações do Cliente</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* WhatsApp */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                WhatsApp
                            </label>
                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <Icon name="phone" className="text-primary text-lg sm:text-xl flex-shrink-0" />
                                <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-all">{client.whatsapp}</span>
                            </div>
                        </div>

                        {/* Apelido */}
                        {client.nickname && (
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Apelido
                                </label>
                                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Icon name="alternate_email" className="text-primary text-lg sm:text-xl flex-shrink-0" />
                                    <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{client.nickname}</span>
                                </div>
                            </div>
                        )}

                        {/* CPF */}
                        {client.cpf && (
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    CPF
                                </label>
                                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Icon name="badge" className="text-primary text-lg sm:text-xl flex-shrink-0" />
                                    <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{client.cpf}</span>
                                </div>
                            </div>
                        )}

                        {/* Observação */}
                        {client.observation && (
                            <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
                                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Observação
                                </label>
                                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Icon name="note" className="text-primary text-lg sm:text-xl mt-0.5 flex-shrink-0" />
                                    <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">{client.observation}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Informações Adicionais */}
                {client.created_at && (
                    <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <Icon name="calendar_today" className="text-sm sm:text-base flex-shrink-0" />
                            <span>
                                Cliente cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={4000}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteModal && client && (
                <div 
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xl max-w-md w-full p-5 sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Icon name="warning" className="text-red-600 dark:text-red-400 text-xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    Excluir Cliente
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Tem certeza que deseja excluir o cliente <span className="font-semibold text-gray-900 dark:text-white">"{client.fullName}"</span>? Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Icon name="delete" className="text-base" />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

