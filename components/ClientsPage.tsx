import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients, useTransactions, useAppointments, useCreditSales } from '../contexts.tsx';
import { Client } from '../types.ts';
import { Toast, ToastType } from './Toast.tsx';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type ViewMode = 'all' | 'new' | 'appointments' | 'credit-sales';

export const ClientsPage: React.FC = () => {
    const navigate = useNavigate();
    const { clients, deleteClient, isLoading } = useClients();
    const { transactions } = useTransactions();
    const { appointments } = useAppointments();
    const { creditSales } = useCreditSales();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    // Calcular métricas
    const metrics = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Clientes novos este mês
        const newClientsThisMonth = clients.filter(client => {
            if (!client.created_at) return false;
            const createdDate = new Date(client.created_at);
            return createdDate.getMonth() === currentMonth && 
                   createdDate.getFullYear() === currentYear;
        }).length;
        
        // Clientes com agendamentos (até 30 dias no futuro)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const clientIdsWithAppointments = new Set(
            appointments
                .filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate >= new Date(getTodayLocalDate()) && 
                           aptDate <= thirtyDaysFromNow;
                })
                .map(apt => apt.clientId)
                .filter(id => id !== undefined)
        );
        const clientsWithActiveAppointments = clients.filter(c => 
            clientIdsWithAppointments.has(c.id)
        ).length;
        
        // Clientes com vendas no fiado em aberto
        const clientIdsWithCreditSales = new Set(
            creditSales
                .filter(cs => cs.status === 'Em Aberto')
                .map(cs => cs.clientId)
                .filter(id => id !== undefined)
        );
        const clientsWithCreditSales = clients.filter(c => 
            clientIdsWithCreditSales.has(c.id)
        ).length;
        
        // Total gasto pelos clientes (apenas clientes da base)
        const clientTotalSpent = new Map<number, number>();
        transactions.forEach(tx => {
            if (tx.clientId) {
                const current = clientTotalSpent.get(tx.clientId) || 0;
                clientTotalSpent.set(tx.clientId, current + tx.value);
            }
        });
        
        // Cliente com maior gasto
        let topSpender: { name: string; amount: number } | null = null;
        clientTotalSpent.forEach((amount, clientId) => {
            const client = clients.find(c => c.id === clientId);
            if (client && (!topSpender || amount > topSpender.amount)) {
                topSpender = { name: client.fullName, amount };
            }
        });
        
        return {
            total: clients.length,
            newThisMonth: newClientsThisMonth,
            withActiveAppointments: clientsWithActiveAppointments,
            withCreditSales: clientsWithCreditSales,
            topSpender
        };
    }, [clients, appointments, creditSales, transactions]);
    
    // Filtrar clientes baseado no viewMode e searchTerm
    const filteredClients = useMemo(() => {
        let baseClients = clients;

        // Filtrar por viewMode
        if (viewMode === 'new') {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            baseClients = clients.filter(client => {
                if (!client.created_at) return false;
                const createdDate = new Date(client.created_at);
                return createdDate.getMonth() === currentMonth && 
                       createdDate.getFullYear() === currentYear;
            });
        } else if (viewMode === 'appointments') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const clientIdsWithAppointments = new Set(
                appointments
                    .filter(apt => {
                        const aptDate = new Date(apt.date);
                        return aptDate >= new Date(getTodayLocalDate()) && 
                               aptDate <= thirtyDaysFromNow;
                    })
                    .map(apt => apt.clientId)
                    .filter(id => id !== undefined)
            );
            baseClients = clients.filter(c => 
                clientIdsWithAppointments.has(c.id)
            );
        } else if (viewMode === 'credit-sales') {
            const clientIdsWithCreditSales = new Set(
                creditSales
                    .filter(cs => cs.status === 'Em Aberto')
                    .map(cs => cs.clientId)
                    .filter(id => id !== undefined)
            );
            baseClients = clients.filter(c => 
                clientIdsWithCreditSales.has(c.id)
            );
        }

        // Aplicar busca se houver searchTerm
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return baseClients.filter(client => {
                return (
                    client.fullName.toLowerCase().includes(search) ||
                    client.whatsapp.toLowerCase().includes(search) ||
                    (client.nickname && client.nickname.toLowerCase().includes(search)) ||
                    (client.cpf && client.cpf.toLowerCase().includes(search)) ||
                    (client.observation && client.observation.toLowerCase().includes(search))
                );
            });
        }

        return baseClients;
    }, [clients, viewMode, searchTerm, appointments, creditSales]);

    // Handler para clicar em cliente (navegar para agendamento ou fiado se necessário)
    const handleClientClick = (client: Client) => {
        if (viewMode === 'appointments') {
            // Encontrar o primeiro agendamento futuro do cliente
            const clientAppointment = appointments
                .filter(apt => {
                    const aptDate = new Date(apt.date);
                    return apt.clientId === client.id && 
                           aptDate >= new Date(getTodayLocalDate());
                })
                .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA.getTime() - dateB.getTime();
                    }
                    return a.time.localeCompare(b.time);
                })[0];

            if (clientAppointment) {
                navigate(`/appointments/${clientAppointment.id}`);
            } else {
                navigate(`/clients/${client.id}`);
            }
        } else if (viewMode === 'credit-sales') {
            // Encontrar a primeira venda no fiado em aberto do cliente
            const clientCreditSale = creditSales
                .filter(cs => cs.clientId === client.id && cs.status === 'Em Aberto')
                .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
                })[0];

            if (clientCreditSale) {
                navigate(`/credit-sales/${clientCreditSale.id}`);
            } else {
                navigate(`/clients/${client.id}`);
            }
        } else {
            navigate(`/clients/${client.id}`);
        }
    };

    // Navegar para adicionar cliente
    const handleAddClick = () => {
        navigate('/clients/new');
    };

    // Navegar para editar cliente
    const handleEditClick = (client: Client) => {
        navigate(`/clients/edit/${client.id}`);
    };

    // Abrir modal de confirmação de exclusão
    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client);
    };

    // Deletar cliente
    const handleDelete = async () => {
        if (!clientToDelete) return;

        try {
            await deleteClient(clientToDelete.id);
            setToast({ message: 'Cliente excluído com sucesso!', type: 'success' });
            setClientToDelete(null);
        } catch (error: any) {
            setToast({ 
                message: `Erro ao excluir cliente: ${error.message || 'Erro desconhecido'}`, 
                type: 'error' 
            });
        }
    };

    const formatCurrency = (value: number): string => {
        const formatted = value.toFixed(2).replace('.', ',');
        const parts = formatted.split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${parts.join(',')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">Clientes</h1>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Gerencie sua base de clientes</p>
                        </div>
                        <button
                            onClick={handleAddClick}
                            className="w-full sm:w-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                            <Icon name="person_add" className="text-base sm:text-lg" />
                            <span>Adicionar Cliente</span>
                        </button>
                    </div>

                    {/* Busca Minimalista */}
                    <div className="relative mb-4 sm:mb-6">
                        <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base z-10" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Icon name="close" className="text-base" />
                            </button>
                        )}
                    </div>

                    {/* Cards de Métricas - só mostra se não estiver pesquisando e não estiver em modo de lista */}
                    {!searchTerm && !viewMode && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                                {/* Total de Clientes */}
                                <div 
                                    onClick={() => setViewMode('all')}
                                    className="bg-white dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                        <Icon name="people" className="text-primary text-lg sm:text-xl" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Total</p>
                                    <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold">{metrics.total}</p>
                                </div>

                                {/* Clientes Novos Este Mês */}
                                <div 
                                    onClick={() => setViewMode('new')}
                                    className="bg-white dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                        <Icon name="person_add" className="text-primary text-lg sm:text-xl" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Novos</p>
                                    <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold">{metrics.newThisMonth}</p>
                                </div>

                                {/* Clientes com Agendamentos */}
                                <div 
                                    onClick={() => setViewMode('appointments')}
                                    className="bg-white dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                        <Icon name="event" className="text-primary text-lg sm:text-xl" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Agendados</p>
                                    <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold">{metrics.withActiveAppointments}</p>
                                </div>

                                {/* Clientes com Fiado */}
                                <div 
                                    onClick={() => setViewMode('credit-sales')}
                                    className="bg-white dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                        <Icon name="account_balance_wallet" className="text-primary text-lg sm:text-xl" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Com Fiado</p>
                                    <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold">{metrics.withCreditSales}</p>
                                </div>
                            </div>

                            {/* Top Spender Card (se houver) */}
                            {metrics.topSpender && (
                                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                            <Icon name="star" className="text-primary text-base sm:text-lg flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">Maior Cliente</p>
                                                <p className="text-gray-900 dark:text-white text-sm sm:text-base font-bold truncate">{metrics.topSpender.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Total</p>
                                            <p className="text-gray-900 dark:text-white text-sm sm:text-base font-bold">{formatCurrency(metrics.topSpender.amount)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Header da Lista com Botão Voltar */}
                    {viewMode && (
                        <div className="mb-4 sm:mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setViewMode(null);
                                        setSearchTerm('');
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Icon name="arrow_back" className="text-gray-600 dark:text-gray-400 text-lg" />
                                </button>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                        {viewMode === 'all' && 'Todos os Clientes'}
                                        {viewMode === 'new' && 'Clientes Novos Este Mês'}
                                        {viewMode === 'appointments' && 'Clientes com Agendamentos'}
                                        {viewMode === 'credit-sales' && 'Clientes com Fiado'}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resultados da Busca */}
                    {searchTerm && !viewMode && (
                        <div className="mb-4 sm:mb-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {filteredClients.length === 0 
                                    ? 'Nenhum cliente encontrado' 
                                    : `${filteredClients.length} ${filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Informações e Estatísticas - só mostra quando não há busca nem modo de lista */}
                {!searchTerm && !viewMode && !isLoading && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Últimos Clientes Cadastrados */}
                        {clients.length > 0 && (
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                                        Últimos Cadastrados
                                    </h2>
                                </div>
                                <div className="space-y-2">
                                    {clients
                                        .sort((a, b) => {
                                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                            return dateB - dateA;
                                        })
                                        .slice(0, 6)
                                        .map((client) => {
                                            const hasAppointments = appointments.some(apt => apt.clientId === client.id);
                                            const hasCreditSales = creditSales.some(cs => cs.clientId === client.id && cs.status === 'Em Aberto');
                                            
                                            return (
                                                <div
                                                    key={client.id}
                                                    onClick={() => navigate(`/clients/${client.id}`)}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all active:scale-[0.98] group"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                                            <Icon name="person" className="text-primary text-lg" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {client.fullName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {client.whatsapp}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {hasAppointments && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs">
                                                                <Icon name="event" className="text-xs" />
                                                            </span>
                                                        )}
                                                        {hasCreditSales && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-xs">
                                                                <Icon name="account_balance_wallet" className="text-xs" />
                                                            </span>
                                                        )}
                                                        <Icon name="chevron_right" className="text-gray-400 group-hover:text-primary text-base transition-colors" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Clientes Mais Ativos */}
                        {transactions.length > 0 && (() => {
                            // Calcular frequência de clientes nas transações
                            const clientFrequency = new Map<number, number>();
                            transactions.forEach(tx => {
                                if (tx.clientId) {
                                    clientFrequency.set(tx.clientId, (clientFrequency.get(tx.clientId) || 0) + 1);
                                }
                            });

                            // Pegar top 5 clientes mais frequentes
                            const topClients = Array.from(clientFrequency.entries())
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([clientId, count]) => {
                                    const client = clients.find(c => c.id === clientId);
                                    return client ? { client, count } : null;
                                })
                                .filter(item => item !== null) as { client: Client; count: number }[];

                            return topClients.length > 0 ? (
                                <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                                            Mais Ativos
                                        </h2>
                                    </div>
                                    <div className="space-y-2">
                                        {topClients.map(({ client, count }, index) => (
                                            <div
                                                key={client.id}
                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all active:scale-[0.98] group"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold text-xs">#{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {client.fullName}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {count} {count === 1 ? 'transação' : 'transações'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Icon name="chevron_right" className="text-gray-400 group-hover:text-primary text-base transition-colors flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null;
                        })()}
                    </div>
                )}

                {/* Lista de Clientes - só mostra se estiver em modo de lista ou pesquisando */}
                {(viewMode || searchTerm) && (
                    <>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="people" className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
                                <p className="text-gray-600 dark:text-gray-400 text-lg">
                                    {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta lista'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                {filteredClients.map((client) => {
                                    // Verificar se cliente tem agendamentos ou fiado
                                    const hasAppointments = appointments.some(apt => apt.clientId === client.id);
                                    const hasCreditSales = creditSales.some(cs => cs.clientId === client.id && cs.status === 'Em Aberto');
                                    
                                    return (
                                    <div
                                        key={client.id}
                                        onClick={() => handleClientClick(client)}
                                        className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group"
                                    >
                                {/* Mobile Layout */}
                                <div className="block sm:hidden">
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left side - Name and WhatsApp */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white break-words flex items-center gap-1.5">
                                                    <Icon name="person" className="text-base text-primary" />
                                                    <span>{client.fullName}</span>
                                                </p>
                                                {hasAppointments && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
                                                        <Icon name="event" className="text-xs" />
                                                    </span>
                                                )}
                                                {hasCreditSales && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
                                                        <Icon name="account_balance_wallet" className="text-xs" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <Icon name="phone" className="text-sm" />
                                                <span>{client.whatsapp}</span>
                                            </div>
                                        </div>

                                        {/* Right side - Chevron */}
                                        <Icon name="chevron_right" className="text-gray-400 group-hover:text-primary text-lg transition-colors" />
                                    </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden sm:flex items-center justify-between gap-3">
                                    {/* Left side - Name and WhatsApp */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                <Icon name="person" className="text-lg text-primary" />
                                                <span>{client.fullName}</span>
                                            </p>
                                            {hasAppointments && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
                                                    <Icon name="event" className="text-xs" />
                                                    Agendado
                                                </span>
                                            )}
                                            {hasCreditSales && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
                                                    <Icon name="account_balance_wallet" className="text-xs" />
                                                    Fiado
                                                </span>
                                            )}
                                            <span className="hidden md:inline text-gray-400">•</span>
                                            <span className="hidden md:flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                <Icon name="phone" className="text-base" />
                                                {client.whatsapp}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right side - Chevron */}
                                    <Icon name="chevron_right" className="text-gray-400 group-hover:text-primary text-xl transition-colors" />
                                </div>
                            </div>
                        )})}
                    </div>
                        )}
                    </>
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
            {clientToDelete && (
                <div 
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={() => setClientToDelete(null)}
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
                                    Tem certeza que deseja excluir o cliente <span className="font-semibold text-gray-900 dark:text-white">"{clientToDelete.fullName}"</span>? Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setClientToDelete(null)}
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

