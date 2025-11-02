import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClients } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Função para formatar WhatsApp: (87) 99155-6444
const formatWhatsApp = (value: string): string => {
    if (!value) return value;
    
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Formata conforme o tamanho
    if (limited.length <= 2) {
        return limited;
    } else if (limited.length <= 7) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
};

// Função para formatar CPF: 116.438.494-50
const formatCPF = (value: string): string => {
    if (!value) return value;
    
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Formata conforme o tamanho
    if (limited.length <= 3) {
        return limited;
    } else if (limited.length <= 6) {
        return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    } else if (limited.length <= 9) {
        return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    } else {
        return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
    }
};

export const EditClientPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { clients, updateClient } = useClients();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const client = clients.find(c => c.id === Number(id));

    const [formData, setFormData] = useState({
        fullName: '',
        whatsapp: '',
        nickname: '',
        observation: '',
        cpf: '',
    });

    // Preencher formulário quando cliente for carregado
    useEffect(() => {
        if (client) {
            setFormData({
                fullName: client.fullName,
                whatsapp: client.whatsapp,
                nickname: client.nickname || '',
                observation: client.observation || '',
                cpf: client.cpf || '',
            });
        }
    }, [client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!client) {
            setToast({ message: 'Cliente não encontrado', type: 'error' });
            return;
        }

        // Validação
        if (!formData.fullName.trim()) {
            setToast({ message: 'Nome completo é obrigatório', type: 'error' });
            return;
        }

        if (!formData.whatsapp.trim()) {
            setToast({ message: 'WhatsApp é obrigatório', type: 'error' });
            return;
        }

        try {
            setIsSubmitting(true);
            await updateClient(client.id, {
                fullName: formData.fullName.trim(),
                whatsapp: formData.whatsapp.trim(),
                nickname: formData.nickname.trim() || undefined,
                observation: formData.observation.trim() || undefined,
                cpf: formData.cpf.trim() || undefined,
            });
            
            setToast({ message: 'Cliente atualizado com sucesso!', type: 'success' });
            
            // Aguardar um pouco para mostrar o Toast e então navegar
            setTimeout(() => {
                navigate('/clients');
            }, 1000);
        } catch (error: any) {
            setIsSubmitting(false);
            setToast({ 
                message: `Erro ao atualizar cliente: ${error.message || 'Erro desconhecido'}`, 
                type: 'error' 
            });
        }
    };

    if (!client) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Icon name="error" className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Cliente não encontrado
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        O cliente que você está procurando não existe.
                    </p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Voltar para Clientes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-8">
                    <button
                        onClick={() => navigate('/clients')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 sm:mb-4 transition-colors text-sm sm:text-base"
                    >
                        <Icon name="arrow_back" className="text-lg sm:text-xl" />
                        <span>Voltar para Clientes</span>
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                            <Icon name="edit" className="text-primary text-xl sm:text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Editar Cliente</h1>
                            <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Atualize as informações do cliente</p>
                        </div>
                    </div>
                </div>

                {/* Formulário */}
                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        {/* Nome Completo (Obrigatório) - Largura total */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                Nome Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="Digite o nome completo do cliente"
                                required
                                autoFocus
                            />
                        </div>

                        {/* WhatsApp e Apelido na mesma linha */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {/* WhatsApp (Obrigatório) */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                    WhatsApp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.whatsapp}
                                    onChange={(e) => {
                                        const formatted = formatWhatsApp(e.target.value);
                                        setFormData({ ...formData, whatsapp: formatted });
                                    }}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="(00) 00000-0000"
                                    maxLength={15}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Número para contato
                                </p>
                            </div>

                            {/* Apelido (Opcional) */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                    Apelido
                                </label>
                                <input
                                    type="text"
                                    value={formData.nickname}
                                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="Digite o apelido (opcional)"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Como prefere ser chamado
                                </p>
                            </div>
                        </div>

                        {/* CPF (Opcional) */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                CPF
                            </label>
                            <input
                                type="text"
                                value={formData.cpf}
                                onChange={(e) => {
                                    const formatted = formatCPF(e.target.value);
                                    setFormData({ ...formData, cpf: formatted });
                                }}
                                className="w-full sm:max-w-xs px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="000.000.000-00"
                                maxLength={14}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                CPF (opcional)
                            </p>
                        </div>

                        {/* Observação (Opcional) */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                Observação
                            </label>
                            <textarea
                                value={formData.observation}
                                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                                placeholder="Digite observações sobre o cliente (opcional)"
                                rows={3}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Observações sobre o cliente (opcional)
                            </p>
                        </div>

                        {/* Botões */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => navigate('/clients')}
                                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white"></div>
                                        <span>Atualizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check_circle" className="text-lg sm:text-xl" />
                                        <span>Atualizar Cliente</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
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
        </div>
    );
};

