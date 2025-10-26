import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, AppointmentStatus } from '../types.ts';
import { useAppointments, useTransactions, useFinalizeAppointment, useEditAppointment } from '../contexts.tsx';

interface AppointmentDetailPageProps {
    appointment: Appointment;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

const getStatusColor = (status: AppointmentStatus): { bg: string; text: string; label: string } => {
    switch (status) {
        case AppointmentStatus.Confirmed:
            return { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', label: 'Confirmado' };
        case AppointmentStatus.Arrived:
            return { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', label: 'Chegou' };
        case AppointmentStatus.Attended:
            return { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', label: 'Atendido' };
    }
};

const extractClientInfo = (clientName: string): { name: string; whatsapp: string | null } => {
    let name = clientName;
    let whatsapp: string | null = null;
    
    if (clientName.includes('|')) {
        [name, whatsapp] = clientName.split('|');
    } else if (clientName.includes('(')) {
        const match = clientName.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            name = match[1].trim();
            whatsapp = match[2].trim();
        }
    }
    
    return { name, whatsapp };
};

export const AppointmentDetailPage: React.FC<AppointmentDetailPageProps> = ({ appointment }) => {
    const navigate = useNavigate();
    const { deleteAppointment, addAppointment } = useAppointments();
    const { addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setEditAppointmentData } = useEditAppointment();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const { name, whatsapp } = extractClientInfo(appointment.clientName);
    const statusInfo = getStatusColor(appointment.status);
    const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null;

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteAppointment(appointment.id);
            navigate(-1);
        } catch (error) {
            console.error('Failed to delete appointment:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = () => {
        const handleSaveEditedAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
            await Promise.all([
                deleteAppointment(appointment.id),
                addAppointment(appointmentData)
            ]);
        };
        
        setEditAppointmentData(appointment, handleSaveEditedAppointment);
        navigate('/edit-appointment');
    };

    const handleFinalize = () => {
        const getTodayLocalDate = (): string => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const onFinalizeHandler = async (transactionData: any) => {
            await Promise.all([
                addTransaction({
                    ...transactionData,
                    date: getTodayLocalDate(),
                }),
            ]);
        };

        setFinalizeData(appointment, onFinalizeHandler);
        navigate('/finalize-appointment');
    };

    const handleWhatsAppClick = () => {
        if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm flex-shrink-0"
                        >
                            <Icon name="arrow_back" className="text-base sm:text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>
                        
                        <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">Detalhes</h1>
                        
                        <div className="w-10 sm:w-16" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Client Card */}
                <div className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 sm:mb-2">Cliente</p>
                        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">{name}</h2>
                    </div>
                    
                    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Status:</p>
                            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.label}
                            </div>
                        </div>

                        {/* WhatsApp */}
                        {whatsapp && (
                            <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-800 break-all">
                                <Icon name="phone" className="text-primary text-base sm:text-lg flex-shrink-0" />
                                <button
                                    onClick={handleWhatsAppClick}
                                    className="text-primary hover:text-primary/80 font-medium text-xs sm:text-sm transition-colors"
                                >
                                    {whatsapp}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Date */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 sm:mb-3">Data</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{appointment.date.split('-').reverse().join('/')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2 capitalize line-clamp-2">{formatDate(appointment.date)}</p>
                    </div>

                    {/* Time */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 sm:mb-3">Horário</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{appointment.time.substring(0, 5)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">Marcado</p>
                    </div>
                </div>

                {/* Service */}
                <div className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 sm:mb-3">Serviço</p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">{appointment.service}</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 sm:space-y-3">
                    {/* Primary Action: Finalize */}
                    <button
                        onClick={handleFinalize}
                        disabled={appointment.status === AppointmentStatus.Attended}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white font-semibold hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                    >
                        <Icon name="check_circle" className="text-base sm:text-lg" />
                        <span>Finalizar</span>
                    </button>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {/* Edit Button */}
                        <button
                            onClick={handleEdit}
                            disabled={appointment.status === AppointmentStatus.Attended}
                            className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                        >
                            <Icon name="edit" className="text-base sm:text-lg" />
                            <span>Editar</span>
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting || appointment.status === AppointmentStatus.Attended}
                            className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                        >
                            <Icon name="delete" className="text-base sm:text-lg" />
                            <span>Excluir</span>
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                                <Icon name="warning" className="text-3xl" />
                                <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.</p>
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
                                >
                                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
