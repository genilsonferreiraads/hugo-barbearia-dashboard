import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClients, useTransactions, useAppointments, useCreditSales } from '../contexts.tsx';
import { Toast, ToastType } from './Toast.tsx';
import { AppointmentStatus, CreditSaleStatus } from '../types.ts';

const Icon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => 
    <span className={`material-symbols-outlined ${className || ''}`} style={style}>{name}</span>;

export const ClientDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { clients, deleteClient } = useClients();
    const { transactions } = useTransactions();
    const { appointments } = useAppointments();
    const { creditSales } = useCreditSales();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const client = clients.find(c => c.id === Number(id));

    const parseDate = (value?: string, time?: string): Date | null => {
        if (!value) return null;
        const iso = time ? `${value}T${time}` : `${value}T00:00:00`;
        const parsed = new Date(iso);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatCurrency = (value: number): string => {
        const formatted = value.toFixed(2).replace('.', ',');
        const parts = formatted.split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${parts.join(',')}`;
    };

    const formatDateLabel = (date: Date | null): string => {
        if (!date) return 'Sem registro';
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const clientTransactions = useMemo(() => {
        if (!client) return [];
        return transactions
            .filter(tx => tx.clientId === client.id)
            .sort((a, b) => {
                const dateA = parseDate(a.date)?.getTime() || 0;
                const dateB = parseDate(b.date)?.getTime() || 0;
                return dateB - dateA;
            });
    }, [client, transactions]);

    const serviceTransactions = useMemo(() => {
        return clientTransactions.filter(tx => tx.type !== 'product');
    }, [clientTransactions]);

    const clientAppointments = useMemo(() => {
        if (!client) return [];
        return appointments
            .filter(apt => apt.clientId === client.id)
            .sort((a, b) => {
                const dateA = parseDate(a.date, a.time)?.getTime() || 0;
                const dateB = parseDate(b.date, b.time)?.getTime() || 0;
                return dateB - dateA;
            });
    }, [client, appointments]);

    const totalSpent = useMemo(() => {
        return clientTransactions.reduce((sum, tx) => sum + tx.value, 0);
    }, [clientTransactions]);

    const preferredPaymentMethod = useMemo(() => {
        const frequency: Record<string, number> = {};
        serviceTransactions.forEach(tx => {
            if (!tx.paymentMethod) return;
            frequency[tx.paymentMethod] = (frequency[tx.paymentMethod] || 0) + 1;
        });
        const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || null;
    }, [serviceTransactions]);

    const lastVisitDate = useMemo(() => {
        const lastTransaction = serviceTransactions.reduce<Date | null>((latest, tx) => {
            const txDate = parseDate(tx.date);
            if (!txDate) return latest;
            if (!latest || txDate.getTime() > latest.getTime()) {
                return txDate;
            }
            return latest;
        }, null);

        const lastAttendedAppointment = clientAppointments.reduce<Date | null>((latest, apt) => {
            if (![AppointmentStatus.Arrived, AppointmentStatus.Attended].includes(apt.status)) {
                return latest;
            }
            const aptDate = parseDate(apt.date, apt.time);
            if (!aptDate) return latest;
            if (!latest || aptDate.getTime() > latest.getTime()) {
                return aptDate;
            }
            return latest;
        }, null);

        if (lastTransaction && lastAttendedAppointment) {
            return lastTransaction.getTime() > lastAttendedAppointment.getTime()
                ? lastTransaction
                : lastAttendedAppointment;
        }

        return lastTransaction || lastAttendedAppointment;
    }, [serviceTransactions, clientAppointments]);

    const daysSinceLastVisit = lastVisitDate
        ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const attendanceSummary = useMemo(() => {
        return clientAppointments.reduce(
            (acc, apt) => {
                acc.total += 1;
                if (apt.status === AppointmentStatus.Confirmed) acc.confirmed += 1;
                if (apt.status === AppointmentStatus.Arrived) acc.arrived += 1;
                if (apt.status === AppointmentStatus.Attended) acc.attended += 1;
                return acc;
            },
            { total: 0, confirmed: 0, arrived: 0, attended: 0 }
        );
    }, [clientAppointments]);

    const outstandingCreditSales = useMemo(() => {
        if (!client) return [];
        return creditSales
            .filter(cs => cs.clientId === client.id && cs.status !== CreditSaleStatus.Paid)
            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
    }, [client, creditSales]);

    const averageTicket = serviceTransactions.length > 0
        ? totalSpent / serviceTransactions.length
        : 0;

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

                {/* Relationship Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total gasto</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(totalSpent)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ticket médio {serviceTransactions.length > 0 ? formatCurrency(averageTicket) : '—'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Visitas registradas</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{serviceTransactions.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{attendanceSummary.attended} cortes concluídos</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Último corte</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{formatDateLabel(lastVisitDate)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {daysSinceLastVisit !== null ? `${daysSinceLastVisit} dia${daysSinceLastVisit !== 1 ? 's' : ''} atrás` : 'Ainda sem visitas registradas'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Forma preferida</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{preferredPaymentMethod || 'Sem histórico'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Baseado nos últimos pagamentos</p>
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

                {/* Preferências e Observações */}
                <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Preferências</h3>
                        <Icon name="favorite" className="text-primary text-xl" />
                    </div>
                    {client.observation ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{client.observation}</p>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sem preferências registradas. Utilize o campo de observações do cliente para anotar estilos, produtos favoritos ou restrições.</p>
                    )}
                </div>

                {/* Histórico de Cortes */}
                <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Histórico de cortes</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Serviços concluídos, valores e formas de pagamento</p>
                        </div>
                        <Icon name="content_cut" className="text-primary text-2xl" />
                    </div>
                    {serviceTransactions.length === 0 ? (
                        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                            Nenhum corte registrado para este cliente ainda.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {serviceTransactions.map((tx) => (
                                <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:border-primary/40 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{tx.service}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Icon name="payments" className="text-xs" />
                                            {tx.paymentMethod || '—'}
                                        </p>
                                    </div>
                                    <div className="flex items-end sm:items-center justify-between sm:justify-end gap-3 min-w-[150px]">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(tx.value)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateLabel(parseDate(tx.date))}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Histórico de Presença */}
                <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Histórico de presença</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhamento de agendamentos e status</p>
                        </div>
                        <Icon name="event_available" className="text-primary text-2xl" />
                    </div>
                    {clientAppointments.length === 0 ? (
                        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                            Este cliente ainda não possui agendamentos registrados.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Confirmados</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{attendanceSummary.confirmed}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Chegou</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{attendanceSummary.arrived}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Atendido</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{attendanceSummary.attended}</p>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                {clientAppointments.map(apt => (
                                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{apt.service}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateLabel(parseDate(apt.date, apt.time))} · {apt.time}</p>
                                        </div>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                                            style={{
                                                borderColor: apt.status === AppointmentStatus.Attended ? 'rgba(34,197,94,0.4)' :
                                                    apt.status === AppointmentStatus.Arrived ? 'rgba(59,130,246,0.4)' :
                                                    'rgba(234,179,8,0.4)',
                                                color: apt.status === AppointmentStatus.Attended ? '#16a34a' :
                                                    apt.status === AppointmentStatus.Arrived ? '#2563eb' :
                                                    '#b45309'
                                            }}
                                        >
                                            {apt.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Fiado */}
                {outstandingCreditSales.length > 0 && (
                    <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Fiado em aberto</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe as parcelas e valores pendentes</p>
                            </div>
                            <Icon name="account_balance_wallet" className="text-primary text-2xl" />
                        </div>
                        <div className="space-y-3">
                            {outstandingCreditSales.map(sale => (
                                <div key={sale.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Venda #{sale.id}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateLabel(parseDate(sale.date))}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/credit-sales/${sale.id}`)}
                                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                        >
                                            <Icon name="open_in_new" className="text-sm" />
                                            Ver detalhes
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                                        <p>Total: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</span></p>
                                        <p>A receber: <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(sale.remainingAmount)}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

