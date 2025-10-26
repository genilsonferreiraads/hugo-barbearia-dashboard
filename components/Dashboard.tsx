import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, AppointmentStatus, Transaction, PaymentMethod } from '../types.ts';
import { generateDailySummary } from '../services/geminiService.ts';
import { NewAppointmentModal } from './NewAppointmentModal.tsx';
import { useAppointments, useTransactions, useFinalizeAppointment, useNewAppointment } from '../contexts.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined text-2xl text-zinc-500 dark:text-zinc-400">{name}</span>;

// New Appointment Options Modal Component
interface AppointmentOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onFinalize: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const AppointmentOptionsModal: React.FC<AppointmentOptionsModalProps> = ({ 
    isOpen, 
    onClose, 
    appointment, 
    onFinalize, 
    onEdit, 
    onDelete 
}) => {
    if (!isOpen || !appointment) return null;

    const handleModalContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl"
                onClick={handleModalContentClick}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Opções</p>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>
                
                <div className="flex flex-col p-5 gap-3">
                    <button
                        onClick={() => { onFinalize(); onClose(); }}
                        className="flex items-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">Finalizar atendimento</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Registrar serviços e pagamento</p>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => { onEdit(); onClose(); }}
                        className="flex items-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined">edit</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">Editar</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Alterar informações do agendamento</p>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => { onDelete(); onClose(); }}
                        className="flex items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-gray-800 p-4 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined">delete</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-red-600 dark:text-red-400">Excluir</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Remover este agendamento</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Confirm Delete Modal Component
interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    appointment: Appointment | null;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    appointment 
}) => {
    if (!isOpen || !appointment) return null;

    const handleModalContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    // Extract client name from appointment
    let clientName = appointment.clientName;
    if (appointment.clientName.includes('|')) {
        [clientName] = appointment.clientName.split('|');
    } else if (appointment.clientName.includes('(')) {
        const match = appointment.clientName.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            clientName = match[1].trim();
        }
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl"
                onClick={handleModalContentClick}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Exclusão</p>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>
                
                <div className="flex flex-col p-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Tem certeza que deseja excluir este agendamento?</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {appointment.time} - {clientName}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Esta ação não pode ser desfeita.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 sm:flex-row sm:justify-end dark:border-white/10">
                    <button 
                        onClick={onClose} 
                        className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex h-11 items-center justify-center rounded-lg bg-red-600 px-6 text-base font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

interface AppointmentCardProps {
    appointment: Appointment;
    onClick: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onClick }) => {
    const statusStyles: { [key in AppointmentStatus]: string } = {
        [AppointmentStatus.Confirmed]: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300",
        [AppointmentStatus.Arrived]: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300",
        [AppointmentStatus.Attended]: "bg-zinc-200 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-300",
    };
    
    const isAttended = appointment.status === AppointmentStatus.Attended;

    // Extract client name and WhatsApp
    // Supports both new format: "Name|(XX) X XXXX-XXXX" and old format: "Name (XX) X XXXX-XXXX"
    let clientName = appointment.clientName;
    let whatsapp: string | null = null;
    
    if (appointment.clientName.includes('|')) {
        // New format with pipe separator
        [clientName, whatsapp] = appointment.clientName.split('|');
    } else if (appointment.clientName.includes('(')) {
        // Old format with parentheses
        const match = appointment.clientName.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            clientName = match[1].trim();
            whatsapp = match[2].trim();
        }
    }
    
    const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null;

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
        }
    };

    return (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 w-full">
            <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#392c28]">
                <Icon name="schedule" />
            </div>
            <button
                onClick={onClick}
                disabled={isAttended}
                className={`flex-1 min-w-0 text-left transition-colors ${isAttended ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
            >
                <p className="text-zinc-900 dark:text-white font-medium text-sm sm:text-base truncate">{appointment.time} - {clientName}</p>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm truncate">{appointment.service}</p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
                {whatsappUrl && (
                    <button
                        onClick={handleWhatsAppClick}
                        className="flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-white p-2 transition-colors"
                        title="Contatar via WhatsApp"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                    </button>
                )}
                <span className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>{appointment.status}</span>
            </div>
        </div>
    );
};

const StatCard = ({ icon, value, label }: { icon: string; value: string; label: string; }) => (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#392c28]">
                <span className="material-symbols-outlined text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">{value}</p>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">{label}</p>
            </div>
        </div>
    </div>
);

export const DashboardPage: React.FC = () => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    const { appointments, addAppointment, updateAppointmentStatus, deleteAppointment } = useAppointments();
    const { transactions, addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setNewAppointmentData } = useNewAppointment();
    const navigate = useNavigate();

    const todayStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTransactions = transactions.filter(tx => tx.date === todayStr);

        const totalRevenue = todayTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const servicesCompleted = todayTransactions.length;
        const averageTicket = servicesCompleted > 0 ? totalRevenue / servicesCompleted : 0;
        
        return { totalRevenue, servicesCompleted, averageTicket };
    }, [transactions]);
    
    const sortedTodayAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const statusOrder: { [key in AppointmentStatus]: number } = {
            [AppointmentStatus.Arrived]: 1,
            [AppointmentStatus.Confirmed]: 2,
            [AppointmentStatus.Attended]: 3,
        };

        return appointments
            .filter(app => app.date === today)
            .sort((a, b) => {
                const orderA = statusOrder[a.status];
                const orderB = statusOrder[b.status];
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return a.time.localeCompare(b.time);
            });
    }, [appointments]);


    const handleGenerateSummary = useCallback(async () => {
        setIsLoading(true);
        setSummary('');
        const result = await generateDailySummary(todayStats);
        setSummary(result);
        setIsLoading(false);
    }, [todayStats]);

    const handleOpenOptionsModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsOptionsModalOpen(true);
    };

    const handleOpenFinalizeModal = () => {
        if (!selectedAppointment) return;
        setFinalizeData(selectedAppointment, handleFinalizeAppointment);
        navigate('/finalize-appointment');
    };

    const handleOpenEditModal = () => {
        setIsEditModalOpen(true);
    };

    const handleDeleteAppointment = () => {
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedAppointment) return;
        try {
            await deleteAppointment(selectedAppointment.id);
            setSelectedAppointment(null);
            setIsDeleteConfirmModalOpen(false);
        } catch (error) {
            console.error('Failed to delete appointment:', error);
            setIsDeleteConfirmModalOpen(false);
        }
    };

    const handleFinalizeAppointment = async (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => {
        if (!selectedAppointment) return;

        await Promise.all([
             addTransaction({
                ...transactionData,
                date: new Date().toISOString().split('T')[0],
            }),
            updateAppointmentStatus(selectedAppointment.id, AppointmentStatus.Attended)
        ]);

        setSelectedAppointment(null);
    };

    return (
        <div className="mx-auto max-w-7xl w-full">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8 mt-4 sm:mt-6">
                <div className="flex flex-col gap-1">
                    <p className="text-zinc-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.033em]">Olá, Hugo!</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-normal">Aqui está um resumo do seu dia.</p>
                </div>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#392c28]/40 px-3 py-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="material-symbols-outlined text-base sm:text-lg">calendar_today</span>
                        <span className="hidden sm:inline">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                        <span className="sm:hidden">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short'})}</span>
                    </div>
                    <button 
                        onClick={() => {
                            const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
                                await addAppointment(appointmentData);
                            };
                            setNewAppointmentData(handleSaveAppointment, new Date().toISOString().split('T')[0]);
                            navigate('/new-appointment');
                        }}
                        className="flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] transition-transform active:scale-95">
                        <span className="material-symbols-outlined text-base">add</span>
                        <span className="truncate">Novo Agendamento</span>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-6">
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold tracking-[-0.015em]">Agendamentos de Hoje</h2>
                    <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15]">
                        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                            {sortedTodayAppointments.length > 0 ? (
                                sortedTodayAppointments
                                    .map(app => <AppointmentCard key={app.id} appointment={app} onClick={() => handleOpenOptionsModal(app)} />)
                            ) : (
                                <p className="p-4 text-center text-zinc-500 dark:text-zinc-400">Nenhum agendamento para hoje.</p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-4">
                    <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold tracking-[-0.015em]">Seu Desempenho Hoje</h2>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 dark:border-primary/50 dark:bg-[#392c28] p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs sm:text-sm font-medium text-primary dark:text-primary">Total Recebido no Dia</p>
                                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 dark:text-white">R$ {todayStats.totalRevenue.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <span className="material-symbols-outlined text-2xl sm:text-3xl lg:text-4xl text-primary">payments</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                       <StatCard icon="check_circle" value={todayStats.servicesCompleted.toString()} label="Serviços Finalizados" />
                       <StatCard icon="receipt_long" value={`R$ ${todayStats.averageTicket.toFixed(2).replace('.', ',')}`} label="Ticket Médio" />
                    </div>
                </div>
            </div>
            
            <div className="mt-6 lg:mt-8">
                 <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold tracking-[-0.015em] mb-4">Resumo do Dia com IA</h2>
                 <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-4 sm:p-6">
                     <button 
                        onClick={handleGenerateSummary}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 rounded-lg h-10 sm:h-11 px-4 sm:px-6 bg-primary text-white text-sm font-bold disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90 w-full sm:w-auto"
                    >
                        {isLoading ? (
                           <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        ) : (
                           <span className="material-symbols-outlined text-base sm:text-lg">auto_awesome</span>
                        )}
                         <span>{isLoading ? 'Gerando...' : 'Gerar Resumo com IA'}</span>
                     </button>
                     {summary && (
                        <div className="mt-4 p-3 sm:p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                            <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap text-sm sm:text-base">{summary}</p>
                        </div>
                     )}
                 </div>
            </div>
             <AppointmentOptionsModal
                isOpen={isOptionsModalOpen}
                onClose={() => setIsOptionsModalOpen(false)}
                appointment={selectedAppointment}
                onFinalize={handleOpenFinalizeModal}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteAppointment}
            />
            <ConfirmDeleteModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setIsDeleteConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                appointment={selectedAppointment}
            />
            {selectedAppointment && (
                <>
                    <NewAppointmentModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setSelectedAppointment(null);
                        }} 
                        onSave={async (appointmentData) => {
                            // Update existing appointment
                            await deleteAppointment(selectedAppointment!.id);
                            await addAppointment(appointmentData);
                            setIsEditModalOpen(false);
                            setSelectedAppointment(null);
                        }}
                        initialDate={selectedAppointment.date}
                        initialAppointment={selectedAppointment}
                    />
                </>
            )}
        </div>
    );
};
