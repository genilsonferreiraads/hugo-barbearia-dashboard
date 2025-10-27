import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, AppointmentStatus, Transaction, PaymentMethod } from '../types.ts';
import { generateDailySummary } from '../services/geminiService.ts';
import { useAppointments, useTransactions, useFinalizeAppointment, useNewAppointment, useEditAppointment } from '../contexts.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined text-2xl text-zinc-500 dark:text-zinc-400">{name}</span>;

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to format appointment time
const formatAppointmentTime = (timeString: string): string => {
    // Extract HH from time (format: HH:MM:SS)
    const hour = parseInt(timeString.substring(0, 2), 10);
    const minutes = timeString.substring(3, 5);
    
    // Determine period
    let period = 'da Manhã';
    if (hour >= 12 && hour < 18) {
        period = 'da Tarde';
    } else if (hour >= 18) {
        period = 'da Noite';
    }
    
    // Format hour without leading zero
    const formattedHour = hour.toString();
    
    return `${formattedHour}:${minutes} ${period}`;
};

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
                className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-gray-200 dark:border-zinc-700"
                onClick={handleModalContentClick}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-6 py-4">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Opções do Agendamento</h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex flex-col p-6 gap-3">
                    {/* Finalizar Button */}
                    <button
                        onClick={() => { onFinalize(); onClose(); }}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 dark:border-primary/30 p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/20 dark:bg-primary/30 text-primary flex-shrink-0">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Finalizar Atendimento</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Registrar serviços e pagamento</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    
                    {/* Editar Button */}
                    <button
                        onClick={() => { onEdit(); onClose(); }}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-4 text-left transition-all hover:border-blue-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                            <span className="material-symbols-outlined text-xl">edit</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Editar</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Alterar informações do agendamento</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    
                    {/* Excluir Button */}
                    <button
                        onClick={() => { onDelete(); onClose(); }}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/10 dark:to-red-900/20 border border-red-200 dark:border-red-800/30 p-4 text-left transition-all hover:border-red-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex-shrink-0">
                            <span className="material-symbols-outlined text-xl">delete</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-red-600 dark:text-red-400 text-sm">Excluir</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Remover este agendamento</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
    onFinalize: (appointment: Appointment) => void;
    onEdit: (appointment: Appointment) => void;
    onDelete: (appointment: Appointment) => void;
    onOpen?: (appointmentId: number) => void;
    isExpanded: boolean;
    onExpandedChange: (id: number, expanded: boolean) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ 
    appointment, 
    onClick,
    onFinalize,
    onEdit,
    onDelete,
    onOpen,
    isExpanded,
    onExpandedChange
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const statusStyles: { [key in AppointmentStatus]: string } = {
        [AppointmentStatus.Confirmed]: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300",
        [AppointmentStatus.Arrived]: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300",
        [AppointmentStatus.Attended]: "bg-zinc-200 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-300",
    };
    const isAttended = appointment.status === AppointmentStatus.Attended;
    const clientName = appointment.clientName.split('|')[0];
    
    // Extract WhatsApp number
    let whatsappNumber = '';
    if (appointment.clientName.includes('|')) {
        const match = appointment.clientName.match(/\|(.+)$/);
        if (match) {
            whatsappNumber = match[1].trim();
        }
    } else {
        whatsappNumber = appointment.clientName.includes('|') ? appointment.clientName.split('|')[1] : '';
    }
    
    const whatsappUrl2 = whatsappNumber ? `https://wa.me/55${whatsappNumber.replace(/\D/g, '')}` : null;

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (whatsappUrl2) {
            let firstName = clientName;
            if (clientName.includes(' ')) {
                firstName = clientName.split(' ')[0];
            }

            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

            const [aptHours, aptMinutes] = appointment.time.split(':').map(Number);
            const appointmentTimeInMinutes = aptHours * 60 + aptMinutes;
            const currentTimeInMinutes = currentHours * 60 + currentMinutes;

            let message: string;
            if (appointmentTimeInMinutes > currentTimeInMinutes) {
                message = `Olá ${firstName}! Lembramos que você tem um agendamento conosco às ${appointment.time}. Contamos com sua presença! 😊`;
            } else {
                message = `Olá ${firstName}! Lembramos que seu agendamento era às ${appointment.time}. Se não conseguiu comparecer, entre em contato para reagendar. Obrigado!`;
            }

            const encodedMessage = encodeURIComponent(message);
            const whatsappUrlWithMessage = `${whatsappUrl2}?text=${encodedMessage}`;
            window.open(whatsappUrlWithMessage, '_blank');
        }
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpanded) {
            setIsClosing(true);
            setTimeout(() => {
                onExpandedChange(appointment.id, false);
                setIsClosing(false);
            }, 300);
        } else {
            onExpandedChange(appointment.id, true);
            onOpen?.(appointment.id);
        }
    };

    return (
        <div className="border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
            {/* Main Appointment Item */}
            <div 
                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 w-full hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer" 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    handleExpand(e);
                }}
            >
                <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#392c28]">
                    <Icon name="schedule" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="space-y-1">
                        <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white break-words">{clientName}</p>
                        <p className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400">{formatAppointmentTime(appointment.time)}</p>
                        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[appointment.status]}`}>
                            {appointment.status === AppointmentStatus.Confirmed && 'Confirmado'}
                            {appointment.status === AppointmentStatus.Arrived && 'Chegou'}
                            {appointment.status === AppointmentStatus.Attended && 'Atendido'}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{appointment.service}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                    {whatsappNumber && (
                        <button
                            onClick={handleWhatsAppClick}
                            className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-primary hover:bg-primary/90 transition-colors flex-shrink-0"
                            title="Abrir WhatsApp"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Action Bar */}
            {isExpanded && (
                <div className={`${isClosing ? 'action-bar-exit' : 'action-bar-enter'} overflow-hidden`}>
                    <div className="px-3 sm:px-5 py-2 bg-gray-50 dark:bg-zinc-900/20 border-t border-gray-200 dark:border-zinc-700/50 flex justify-center gap-3 sm:gap-4">
                        {/* Finalizar */}
                        <button
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                onFinalize(appointment);
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-all active:scale-95 text-xs"
                            title="Finalizar atendimento"
                        >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            <span>Finalizar</span>
                        </button>
                        
                        {/* Editar */}
                        <button
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit(appointment);
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-all active:scale-95 text-xs"
                            title="Editar agendamento"
                        >
                            <span className="material-symbols-outlined text-base">edit</span>
                            <span>Editar</span>
                        </button>
                        
                        {/* Excluir */}
                        <button
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(appointment);
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-all active:scale-95 text-xs"
                            title="Excluir agendamento"
                        >
                            <span className="material-symbols-outlined text-base">delete</span>
                            <span>Excluir</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, value, label, onClick }: { icon: string; value: string; label: string; onClick?: () => void }) => (
    <div 
        className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-4 sm:p-5 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary/50 hover:scale-105' : ''}`}
        onClick={onClick}
    >
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
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);
    
    const { appointments, addAppointment, updateAppointmentStatus, deleteAppointment } = useAppointments();
    const { transactions, addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setNewAppointmentData } = useNewAppointment();
    const { setEditAppointmentData } = useEditAppointment();
    const navigate = useNavigate();

    const todayStats = useMemo(() => {
        const todayStr = getTodayLocalDate();
        const todayTransactions = transactions.filter(tx => tx.date === todayStr);

        const totalRevenue = todayTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const servicesCompleted = todayTransactions.length;
        const averageTicket = servicesCompleted > 0 ? totalRevenue / servicesCompleted : 0;
        
        return { totalRevenue, servicesCompleted, averageTicket };
    }, [transactions]);
    
    const sortedTodayAppointments = useMemo(() => {
        const today = getTodayLocalDate();
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

    const handleOpenFinalizeModal = (apt?: Appointment) => {
        const appointment = apt || selectedAppointment;
        if (!appointment) return;
        setFinalizeData(appointment, handleFinalizeAppointment, '/finalized-services');
        navigate('/finalize-appointment');
    };

    const handleOpenEditModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        if (!appointment) return;
        
        // Create handler for saving edited appointment
        const handleSaveEditedAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
            await Promise.all([
                deleteAppointment(appointment.id),
                addAppointment(appointmentData)
            ]);
        };
        
        setEditAppointmentData(appointment, handleSaveEditedAppointment);
        navigate('/edit-appointment');
    };

    const handleDeleteAppointment = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
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
                date: getTodayLocalDate(),
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
                            setNewAppointmentData(handleSaveAppointment, getTodayLocalDate());
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
                                    .map(app => (
                                        <AppointmentCard 
                                            key={app.id} 
                                            appointment={app} 
                                            onClick={() => handleOpenOptionsModal(app)}
                                            onFinalize={(apt) => { 
                                                handleOpenFinalizeModal(apt);
                                            }}
                                            onEdit={(apt) => { handleOpenEditModal(apt); }}
                                            onDelete={(apt) => { handleDeleteAppointment(apt); }}
                                            onOpen={() => {
                                                // Close any previously opened bars by forcing a re-render
                                                // This is handled by the key prop which uses app.id
                                            }}
                                            isExpanded={expandedAppointmentId === app.id}
                                            onExpandedChange={(id, expanded) => {
                                                setExpandedAppointmentId(expanded ? id : null);
                                            }}
                                        />
                                    ))
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
                       <StatCard 
                           icon="check_circle" 
                           value={todayStats.servicesCompleted.toString()} 
                           label="Serviços Finalizados"
                           onClick={() => navigate('/finalized-services?from=dashboard')}
                       />
                       <StatCard icon="receipt_long" value={`R$ ${todayStats.averageTicket.toFixed(2).replace('.', ',')}`} label="Ticket Médio" />
                    </div>
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
        </div>
    );
};
