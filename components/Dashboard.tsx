import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
    // Check if appointment is attended - use case-insensitive comparison
    const getStatusString = (status: any): string => {
        if (!status) return '';
        return String(status).trim().toLowerCase();
    };
    const statusStr = getStatusString(appointment.status);
    const attendedStr = getStatusString(AppointmentStatus.Attended);
    const isAttended = statusStr === attendedStr || 
                      statusStr === 'atendido' ||
                      appointment.status === AppointmentStatus.Attended ||
                      String(appointment.status) === 'Atendido';
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
        // Don't open WhatsApp if appointment is attended
        if (isAttended) {
            return;
        }
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

    const handleCardClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Allow expansion for all appointments, including attended ones
        handleExpand(e);
    };

    return (
        <div className="border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
            {/* Main Appointment Item */}
            <div 
                className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 w-full transition-colors cursor-pointer ${isAttended ? 'opacity-60 hover:bg-gray-50/50 dark:hover:bg-gray-900/15' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}
                onClick={handleCardClick}
            >
                <div className={`flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-lg ${isAttended ? 'bg-zinc-100/70 dark:bg-[#392c28]/50' : 'bg-zinc-100 dark:bg-[#392c28]'}`}>
                    <Icon name="schedule" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="space-y-1">
                        <p className={`text-sm sm:text-base font-bold break-words ${isAttended ? 'text-zinc-600 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>{clientName}</p>
                        <p className={`text-xs sm:text-sm font-semibold ${isAttended ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}>{formatAppointmentTime(appointment.time)}</p>
                        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[appointment.status] || statusStyles[AppointmentStatus.Attended]}`}>
                            {appointment.status === AppointmentStatus.Confirmed && 'Confirmado'}
                            {appointment.status === AppointmentStatus.Arrived && 'Chegou'}
                            {(appointment.status === AppointmentStatus.Attended || String(appointment.status) === 'Atendido') && 'Atendido'}
                        </div>
                        <p className={`text-xs truncate ${isAttended ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-400'}`}>{appointment.service}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                    {whatsappNumber && (
                        <button
                            onClick={handleWhatsAppClick}
                            className={`flex size-8 sm:size-9 items-center justify-center rounded-lg transition-colors flex-shrink-0 ${isAttended ? 'bg-primary/60 hover:bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                            title={isAttended ? "WhatsApp desabilitado para agendamentos atendidos" : "Abrir WhatsApp"}
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
                        {/* Use EXACT same check as badge - if badge shows "Atendido", show only one button */}
                        {(appointment.status === AppointmentStatus.Attended || String(appointment.status) === 'Atendido') ? (
                            /* For attended appointments, show only "Go to finalized services" button */
                            <button
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClick();
                                }}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-all active:scale-95 text-xs"
                                title="Ver atendimentos finalizados"
                            >
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                <span>Atendimentos Finalizados</span>
                            </button>
                        ) : (
                            <>
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
                            </>
                        )}
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
    
    const { appointments, fetchAppointments, addAppointment, updateAppointmentStatus, deleteAppointment } = useAppointments();
    const { transactions, fetchTransactions, addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setNewAppointmentData } = useNewAppointment();
    const { setEditAppointmentData } = useEditAppointment();
    const navigate = useNavigate();
    
    // Recarregar agendamentos e transações quando cliente for atualizado
    useEffect(() => {
        const handleClientUpdated = () => {
            fetchAppointments();
            fetchTransactions();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchAppointments, fetchTransactions]);

    const todayStats = useMemo(() => {
        const todayStr = getTodayLocalDate();
        const todayTransactions = transactions.filter(tx => tx.date === todayStr);
        
        // Separar serviços e vendas de produtos
        const todayServices = todayTransactions.filter(tx => 
            tx.type !== 'product' && tx.clientName !== 'Venda de Produto'
        );
        const todaySales = todayTransactions.filter(tx => 
            tx.type === 'product' || tx.clientName === 'Venda de Produto'
        );

        const totalRevenue = todayTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const servicesCompleted = todayServices.length;
        const salesCompleted = todaySales.length;
        const averageTicket = servicesCompleted > 0 
            ? todayServices.reduce((acc, tx) => acc + tx.value, 0) / servicesCompleted 
            : 0;
        
        // Calcular métodos de pagamento
        const paymentMethods: { [key: string]: number } = {};
        todayTransactions.forEach(tx => {
            if (tx.payments && Array.isArray(tx.payments)) {
                tx.payments.forEach(payment => {
                    const method = payment.method || 'Não especificado';
                    paymentMethods[method] = (paymentMethods[method] || 0) + payment.value;
                });
            }
        });

        // Método de pagamento mais usado
        let mostUsedPaymentMethod = 'N/A';
        let maxAmount = 0;
        Object.entries(paymentMethods).forEach(([method, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                mostUsedPaymentMethod = method;
            }
        });
        
        return { 
            totalRevenue, 
            servicesCompleted, 
            salesCompleted, 
            averageTicket,
            paymentMethods,
            mostUsedPaymentMethod
        };
    }, [transactions]);

    const weekStats = useMemo(() => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        
        const weekTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= weekAgo && txDate <= today;
        });
        
        const totalRevenue = weekTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const totalTransactions = weekTransactions.length;
        
        return { totalRevenue, totalTransactions };
    }, [transactions]);

    const monthStats = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const monthTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
        });
        
        const totalRevenue = monthTransactions.reduce((acc, tx) => acc + tx.value, 0);
        const totalTransactions = monthTransactions.length;
        
        return { totalRevenue, totalTransactions };
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
        // If appointment is already attended, navigate to finalized services of today
        if (appointment.status === AppointmentStatus.Attended || 
            String(appointment.status) === 'Atendido' ||
            String(appointment.status).toLowerCase() === 'atendido') {
            navigate('/register-service?from=dashboard');
            return;
        }
        
        setSelectedAppointment(appointment);
        setIsOptionsModalOpen(true);
    };

    const handleOpenFinalizeModal = (apt?: Appointment) => {
        const appointment = apt || selectedAppointment;
        if (!appointment) return;
        
        // Create a handler that captures the appointment in its closure
        const handleFinalizeWithAppointment = async (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => {
            try {
                await Promise.all([
                    addTransaction({
                        ...transactionData,
                        date: getTodayLocalDate(),
                    }),
                    updateAppointmentStatus(appointment.id, AppointmentStatus.Attended)
                ]);
            } catch (error) {
                console.error('Error in handleFinalizeWithAppointment:', error);
                throw error;
            }
        };
        
        setFinalizeData(appointment, handleFinalizeWithAppointment, '/register-service');
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
                        onClick={() => navigate('/register-service/new')}
                        className="flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] transition-transform active:scale-95">
                        <span className="material-symbols-outlined text-base">add</span>
                        <span className="truncate">Novo Atendimento</span>
                    </button>
                </div>
            </div>
            
            {/* Appointments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col gap-4 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold tracking-[-0.015em]">Agendamentos de Hoje</h2>
                        <button 
                            onClick={() => {
                                const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
                                    await addAppointment(appointmentData);
                                };
                                setNewAppointmentData(handleSaveAppointment, getTodayLocalDate());
                                navigate('/new-appointment');
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-all"
                            title="Novo Agendamento"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
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
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                                        <span className="material-symbols-outlined text-3xl text-zinc-400">event_busy</span>
                                    </div>
                                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum agendamento para hoje</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Crie um novo agendamento para começar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions Sidebar */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-zinc-900 dark:text-white text-lg sm:text-xl font-bold tracking-[-0.015em]">Ações Rápidas</h2>
                    
                    <button
                        onClick={() => navigate('/register-service/new')}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/20">
                            <span className="material-symbols-outlined text-xl text-primary">add_circle</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">Novo Atendimento</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Registrar ordem de chegada</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/schedule')}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-4 text-left transition-all hover:border-blue-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">calendar_today</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">Ver Agenda</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Gerenciar agendamentos</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/sales/new')}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-900/20 border border-green-200 dark:border-green-800/30 p-4 text-left transition-all hover:border-green-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                            <span className="material-symbols-outlined text-xl text-green-600 dark:text-green-400">shopping_bag</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">Vender Produto</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Registrar venda</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/reports')}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800/30 p-4 text-left transition-all hover:border-purple-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <span className="material-symbols-outlined text-xl text-purple-600 dark:text-purple-400">bar_chart</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">Ver Relatórios</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Análise completa</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/financial')}
                        className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800/30 p-4 text-left transition-all hover:border-orange-300 hover:shadow-lg active:scale-95"
                    >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                            <span className="material-symbols-outlined text-xl text-orange-600 dark:text-orange-400">account_balance_wallet</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-zinc-900 dark:text-white text-sm">Financeiro</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Fluxo de caixa</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Stats Cards - Today */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div 
                    className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
                    onClick={() => navigate('/reports?date=today')}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20 dark:bg-primary/30">
                            <span className="material-symbols-outlined text-xl text-primary">payments</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Hoje</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white mb-1">R$ {todayStats.totalRevenue.toFixed(2).replace('.', ',')}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Total Recebido</p>
                </div>

                <StatCard 
                    icon="check_circle" 
                    value={todayStats.servicesCompleted.toString()} 
                    label="Atendimentos Hoje"
                    onClick={() => navigate('/register-service?from=dashboard')}
                />

                <StatCard 
                    icon="shopping_cart" 
                    value={todayStats.salesCompleted.toString()} 
                    label="Vendas Hoje"
                    onClick={() => navigate('/sales?date=today')}
                />
            </div>

            {/* Week and Month Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div 
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-[#2a1a15] p-5 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate('/reports?date=week')}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Últimos 7 Dias</p>
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">R$ {weekStats.totalRevenue.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">calendar_view_week</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">{weekStats.totalTransactions} transações</span>
                    </div>
                </div>

                <div 
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-[#2a1a15] p-5 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate('/reports?date=month')}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">Este Mês</p>
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">R$ {monthStats.totalRevenue.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="flex size-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                            <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">calendar_month</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">{monthStats.totalTransactions} transações</span>
                    </div>
                </div>
            </div>

            {/* Payment Methods Breakdown */}
            {Object.keys(todayStats.paymentMethods).length > 0 && (
                <div className="mb-6">
                    <h2 className="text-zinc-900 dark:text-white text-lg font-bold mb-4">Formas de Pagamento Hoje</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {Object.entries(todayStats.paymentMethods).map(([method, amount]) => (
                            <div key={method} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#2a1a15] p-3">
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 truncate">{method}</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-white">R$ {amount.toFixed(2).replace('.', ',')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
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
