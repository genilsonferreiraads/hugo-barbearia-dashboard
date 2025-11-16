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

export const AppointmentDetailPage: React.FC<AppointmentDetailPageProps> = ({ appointment: initialAppointment }) => {
    const navigate = useNavigate();
    const { deleteAppointment, addAppointment, appointments, updateAppointmentStatus } = useAppointments();
    const { addTransaction } = useTransactions();
    const { setFinalizeData } = useFinalizeAppointment();
    const { setEditAppointmentData } = useEditAppointment();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [currentAppointment, setCurrentAppointment] = React.useState<Appointment>(initialAppointment);
    const receiptRef = React.useRef<HTMLDivElement>(null);

    // Atualizar o agendamento quando a lista de agendamentos mudar
    React.useEffect(() => {
        const updated = appointments.find(apt => apt.id === initialAppointment.id);
        if (updated) {
            setCurrentAppointment(updated);
        } else {
            // Se o agendamento foi deletado, procurar pelo mesmo cliente, data e horário
            const sameAppointment = appointments.find(apt => 
                apt.clientName === initialAppointment.clientName &&
                apt.date === initialAppointment.date &&
                apt.time === initialAppointment.time
            );
            if (sameAppointment) {
                setCurrentAppointment(sameAppointment);
            }
        }
    }, [appointments, initialAppointment.id, initialAppointment.clientName, initialAppointment.date, initialAppointment.time]);

    const { name, whatsapp } = extractClientInfo(currentAppointment.clientName);
    const statusInfo = getStatusColor(currentAppointment.status);
    const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null;

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteAppointment(currentAppointment.id);
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
                deleteAppointment(currentAppointment.id),
                addAppointment(appointmentData)
            ]);
        };
        
        setEditAppointmentData(currentAppointment, handleSaveEditedAppointment);
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
                updateAppointmentStatus(currentAppointment.id, AppointmentStatus.Attended)
            ]);
        };

        setFinalizeData(currentAppointment, onFinalizeHandler, '/register-service');
        navigate('/finalize-appointment');
    };

    const handleWhatsAppClick = () => {
        if (whatsappUrl) {
            const dateObj = new Date(`${currentAppointment.date}T00:00:00`);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const formattedTime = currentAppointment.time.substring(0, 5);
            
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

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Erro ao gerar imagem: blob nulo');
                    setIsGenerating(false);
                    return;
                }

                const file = new File([blob], `comprovante-${clientNameOnly}.png`, { type: 'image/png' });

                // Se tiver WhatsApp do agendamento, compartilhar diretamente pelo WhatsApp
                if (whatsapp && window.innerWidth <= 768) {
                    try {
                        // Criar URL do blob
                        const url = URL.createObjectURL(blob);
                        
                        // Tentar compartilhar via Web Share API primeiro
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: 'Comprovante de Agendamento',
                                text: `Comprovante de agendamento - ${clientNameOnly} - ${formatDate(currentAppointment.date)} às ${currentAppointment.time}`
                            });
                        } else {
                            // Fallback: abrir WhatsApp Web
                            const whatsappNumber = whatsapp.replace(/\D/g, '');
                            const message = encodeURIComponent(`Olá! Segue o comprovante do seu agendamento:\n\n📅 ${formatDate(currentAppointment.date)}\n⏰ ${currentAppointment.time.substring(0, 5)}`);
                            window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, '_blank');
                            
                            // Download do comprovante para anexar manualmente
                            fallbackDownload(blob, clientNameOnly);
                        }
                        
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 500);
                        
                        setIsGenerating(false);
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            console.error('Erro ao compartilhar:', error);
                            fallbackDownload(blob, clientNameOnly);
                        }
                        setIsGenerating(false);
                    }
                } else {
                    // Se não tiver WhatsApp ou for desktop, usar o seletor de apps
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'Comprovante de Agendamento',
                                text: `Comprovante de agendamento - ${clientNameOnly} - ${formatDate(currentAppointment.date)} às ${currentAppointment.time}`
                            });
                            setIsGenerating(false);
                        } catch (error: any) {
                            if (error.name !== 'AbortError') {
                                console.error('Erro ao compartilhar:', error);
                                fallbackDownload(blob, clientNameOnly);
                            }
                            setIsGenerating(false);
                        }
                    } else {
                        fallbackDownload(blob, clientNameOnly);
                        setIsGenerating(false);
                    }
                }
            }, 'image/png');

        } catch (error) {
            alert(`Erro ao gerar comprovante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            setIsGenerating(false);
        }
    };

    const fallbackDownload = (blob: Blob, clientName: string) => {
        // Download da imagem como fallback
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprovante-${clientName}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 500);
        
        alert('Comprovante salvo! Você pode compartilhá-lo através de seus arquivos.');
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
            <style>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse-soft {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                
                .animate-slide-in-up {
                    animation: slideInUp 0.4s ease-out;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px -5px rgba(var(--primary-rgb), 0.3), 0 8px 10px -6px rgba(var(--primary-rgb), 0.2);
                }
                
                .btn-primary:active:not(:disabled) {
                    transform: translateY(0);
                }
                
                .btn-secondary {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-secondary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.1);
                }
                
                .card-hover {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .card-hover:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.15);
                }
                
                .gradient-border {
                    position: relative;
                    background: linear-gradient(to right, var(--primary-color), var(--primary-dark));
                    padding: 1px;
                    border-radius: 12px;
                }
                
                .gradient-border-content {
                    background: white;
                    border-radius: 11px;
                }
                
                .dark .gradient-border-content {
                    background: rgba(17, 24, 39, 0.5);
                }
            `}</style>
            
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center justify-between gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm font-medium flex-shrink-0"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="hidden sm:inline">Voltar</span>
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Detalhes do Agendamento</h1>
                        </div>
                        
                        <div className="w-16 sm:w-20" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
                {/* Client Card */}
                <div className="animate-slide-in-up card-hover bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent dark:from-primary/30 dark:via-primary/15 dark:to-transparent p-2.5 sm:p-3 border-b border-gray-200/50 dark:border-gray-800/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-3xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Icon name="person" className="text-primary text-sm" />
                                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Cliente</p>
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">{name}</h2>
                        </div>
                    </div>
                    
                    <div className="p-2.5 sm:p-3 space-y-2.5">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Icon name="check_circle" className="text-gray-400 dark:text-gray-500 text-sm" />
                            <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Status:</p>
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text} shadow-sm`}>
                                {statusInfo.label}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-2 gap-2.5 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                    {/* Date */}
                    <div className="card-hover bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 sm:p-3 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-primary/10 dark:bg-primary/20 rounded-md">
                                    <Icon name="calendar_today" className="text-primary text-sm" />
                                </div>
                                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Data</p>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5">{currentAppointment.date.split('-').reverse().join('/')}</p>
                            <p className="text-[9px] text-gray-500 dark:text-gray-400 capitalize line-clamp-2">{formatDate(currentAppointment.date)}</p>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="card-hover bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 sm:p-3 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-primary/10 dark:bg-primary/20 rounded-md">
                                    <Icon name="schedule" className="text-primary text-sm" />
                                </div>
                                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Horário</p>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5">{currentAppointment.time.substring(0, 5)}</p>
                            <p className="text-[9px] text-gray-500 dark:text-gray-400">Horário marcado</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Professional Layout */}
                <div className="space-y-2 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                    {/* Primary Action - Finalize */}
                    <button
                        onClick={handleFinalize}
                        disabled={currentAppointment.status === AppointmentStatus.Attended}
                        className="w-full group relative overflow-hidden bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg py-2.5 px-4 font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <Icon name="check_circle" className="text-lg" />
                            <span>Finalizar Atendimento</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                    </button>

                    {/* Secondary Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* WhatsApp Button */}
                        {whatsapp && (
                            <button
                                onClick={handleWhatsAppClick}
                                className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg py-2 px-3 font-medium text-xs shadow-md shadow-green-600/25 hover:shadow-lg hover:shadow-green-600/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span>Lembrete</span>
                                </span>
                            </button>
                        )}

                        {/* Receipt Button */}
                        <button
                            onClick={handleDownloadReceipt}
                            disabled={isGenerating}
                            className={`group relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary hover:from-primary hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg py-2 px-3 font-medium text-xs shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 disabled:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed ${!whatsapp ? 'col-span-2' : ''}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-1.5">
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="share" className="text-base" />
                                        <span>Comprovante</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </div>

                    {/* Tertiary Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Edit Button */}
                        <button
                            onClick={handleEdit}
                            disabled={currentAppointment.status === AppointmentStatus.Attended}
                            className="group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary rounded-lg py-2 px-3 font-medium text-xs shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:text-gray-700 dark:disabled:hover:text-gray-300"
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Icon name="edit" className="text-base" />
                                <span>Editar</span>
                            </span>
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting || currentAppointment.status === AppointmentStatus.Attended}
                            className="group bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 hover:border-red-500 dark:hover:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg py-2 px-3 font-medium text-xs shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-red-200 dark:disabled:hover:border-red-800"
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Icon name="delete" className="text-base" />
                                <span>Excluir</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <Icon name="warning" className="text-red-600 dark:text-red-400 text-3xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirmar Exclusão</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-lg shadow-red-500/30"
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
                <AppointmentReceipt appointment={currentAppointment} />
            </div>
        </div>
    );
};
