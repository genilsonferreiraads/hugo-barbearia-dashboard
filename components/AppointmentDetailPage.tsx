import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, AppointmentStatus } from '../types.ts';
import { useAppointments, useTransactions, useFinalizeAppointment, useEditAppointment } from '../contexts.tsx';
import html2canvas from 'html2canvas';
import { AppointmentReceipt } from './AppointmentReceipt.tsx';

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
    const [isGenerating, setIsGenerating] = React.useState(false);
    const receiptRef = React.useRef<HTMLDivElement>(null);

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

        setFinalizeData(appointment, onFinalizeHandler, '/register-service');
        navigate('/finalize-appointment');
    };

    const handleWhatsAppClick = () => {
        if (whatsappUrl) {
            const dateObj = new Date(`${appointment.date}T00:00:00`);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const formattedTime = appointment.time.substring(0, 5);
            
            const message = `Olá ${name}! 👋\n\nLembramos que você tem um agendamento conosco em:\n\n📅 ${formattedDate}\n⏰ ${formattedTime}\n\nContamos com sua presença! 😊`;
            
            const whatsappUrlWithMessage = `${whatsappUrl}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrlWithMessage, '_blank');
        }
    };

    const handleDownloadReceipt = async () => {
        if (!receiptRef.current) {
            alert('Comprovante não encontrado');
            return;
        }

        try {
            setIsGenerating(true);

            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#000000',
                scale: 2,
                logging: false,
                allowTaint: true,
                useCORS: true,
                proxy: null,
                foreignObjectRendering: false,
            });

            const clientNameOnly = name;

            canvas.toBlob((blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem: blob nulo');
                    setIsGenerating(false);
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `comprovante-${clientNameOnly}.png`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    setIsGenerating(false);
                }, 500);
            }, 'image/png');

        } catch (error) {
            alert(`Erro ao gerar comprovante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            setIsGenerating(false);
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
                            <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    onClick={handleWhatsAppClick}
                                    className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span>Enviar Lembrete</span>
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

                    {/* Download Receipt Button */}
                    <button
                        onClick={handleDownloadReceipt}
                        disabled={isGenerating}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white"></div>
                                <span>Gerando...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="download" className="text-base sm:text-lg" />
                                <span>Baixar Comprovante</span>
                            </>
                        )}
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

            {/* Receipt (hidden for generation) */}
            <div ref={receiptRef} className="absolute left-[-9999px] top-[-9999px]">
                <AppointmentReceipt appointment={appointment} />
            </div>
        </div>
    );
};
