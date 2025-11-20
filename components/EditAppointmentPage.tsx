import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment } from '../types.ts';
import { useAppointments, useAppointmentDetail } from '../contexts.tsx';

interface EditAppointmentPageProps {
    onSave: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    initialAppointment: Appointment;
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

const AVAILABLE_TIMES = ['08:00', '10:00', '14:00', '16:00'];

const normalizeTime = (time: string): string => {
    if (time.includes(':') && time.split(':').length === 3) {
        return time.substring(0, 5);
    }
    return time;
};

const isTimeInPast = (date: string, time: string): boolean => {
    const now = new Date();
    const normalizedTime = normalizeTime(time);
    const selectedDateTime = new Date(`${date}T${normalizedTime}:00`);
    return selectedDateTime < now;
};

const capitalizeName = (name: string): string => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatWhatsApp = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    
    if (limited.length <= 2) return limited;
    if (limited.length <= 3) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3, 7)}-${limited.slice(7)}`;
};

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const EditAppointmentPage: React.FC<EditAppointmentPageProps> = ({ onSave, initialAppointment }) => {
    const navigate = useNavigate();
    const { appointments } = useAppointments();
    const { setAppointmentDetail } = useAppointmentDetail();
    const [step, setStep] = useState(1);
    const [clientName, setClientName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<{ clientName: string; date: string; time: string } | null>(null);

    // Initialize with existing appointment data
    useEffect(() => {
        if (initialAppointment) {
            setDate(initialAppointment.date);
            setTime(normalizeTime(initialAppointment.time));
            
            // Extract client name and WhatsApp
            if (initialAppointment.clientName.includes('|')) {
                const parts = initialAppointment.clientName.split('|');
                setClientName(parts[0]);
                if (parts[1]) {
                    setWhatsapp(formatWhatsApp(parts[1]));
                }
            } else if (initialAppointment.clientName.includes('(')) {
                const match = initialAppointment.clientName.match(/^(.+?)\s*\((.+?)\)/);
                if (match) {
                    setClientName(match[1].trim());
                    if (match[2]) {
                        setWhatsapp(formatWhatsApp(match[2]));
                    }
                } else {
                    setClientName(initialAppointment.clientName);
                }
            } else {
                setClientName(initialAppointment.clientName);
            }
        }
    }, [initialAppointment]);

    // Monitor appointments changes and navigate when new appointment is found
    useEffect(() => {
        if (pendingNavigation) {
            const newAppointment = appointments.find(apt => {
                const aptTimeNormalized = normalizeTime(apt.time);
                const pendingTimeNormalized = normalizeTime(pendingNavigation.time);
                
                return apt.clientName === pendingNavigation.clientName &&
                    apt.date === pendingNavigation.date &&
                    aptTimeNormalized === pendingTimeNormalized &&
                    apt.id !== initialAppointment.id;
            });
            
            if (newAppointment) {
                setPendingNavigation(null);
                setIsSubmitting(false);
                setAppointmentDetail(newAppointment);
                navigate(`/appointment/${newAppointment.id}`);
            }
        }
    }, [appointments, pendingNavigation, initialAppointment.id, navigate, setAppointmentDetail]);
    
    // Timeout de segurança - se depois de 5 segundos não encontrar o agendamento, navegar para a agenda
    useEffect(() => {
        if (pendingNavigation) {
            const timeoutId = setTimeout(() => {
                setPendingNavigation(null);
                setIsSubmitting(false);
                navigate('/schedule');
            }, 5000);
            
            return () => clearTimeout(timeoutId);
        }
    }, [pendingNavigation, navigate]);

    const handleNextStep = () => {
        setErrorMessage('');
        if (step === 1 && clientName.trim()) {
            if (whatsapp) {
                const numbers = whatsapp.replace(/\D/g, '');
                if (numbers.length < 10 || numbers.length > 11) {
                    setErrorMessage("Por favor, insira um número de WhatsApp válido com DDD (10 ou 11 dígitos).");
                    return;
                }
            }
            setStep(2);
        }
    };

    const handlePrevStep = () => {
        if (step > 1) {
            setErrorMessage('');
            setStep(step - 1);
        }
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsapp(formatted);
    };

    // Function to check if a time slot is available (excluding current appointment)
    const isTimeSlotAvailable = (selectedDate: string, selectedTime: string): boolean => {
        const normalizedTime = normalizeTime(selectedTime);
        
        // If it's the same date and time as the original appointment, it's always available
        if (selectedDate === initialAppointment.date && normalizedTime === normalizeTime(initialAppointment.time)) {
            return true;
        }
        
        const isBooked = appointments.some(apt => {
            // Skip the current appointment being edited
            if (apt.id === initialAppointment.id) {
                return false;
            }
            const aptNormalizedTime = normalizeTime(apt.time);
            return apt.date === selectedDate && aptNormalizedTime === normalizedTime;
        });
        return !isBooked;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        
        if (!time) {
            setErrorMessage("Por favor, selecione um horário!");
            return;
        }

        const isPast = isTimeInPast(date, time);
        if (isPast) {
            setErrorMessage("Este horário já passou!");
            return;
        }

        // Check if the time slot is available (excluding current appointment)
        if (!isTimeSlotAvailable(date, time)) {
            setErrorMessage("Este horário já está ocupado nesta data. Por favor, escolha outro horário.");
            return;
        }

        try {
            setIsSubmitting(true);
            const clientNameWithWhatsApp = whatsapp ? `${clientName}|${whatsapp.replace(/\D/g, '')}` : clientName;
            
            await onSave({
                clientName: clientNameWithWhatsApp,
                service: '',
                date,
                time,
            });
            
            // Define pendingNavigation para que o useEffect navegue quando o appointment for criado
            setPendingNavigation({
                clientName: clientNameWithWhatsApp,
                date,
                time
            });
        } catch (error: any) {
            console.error("Failed to save appointment:", error);
            setErrorMessage(`Falha ao salvar agendamento: ${error.message || 'Erro desconhecido.'}`);
            setIsSubmitting(false);
        }
    };

    // Detectar se é mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header with Back Button */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>
                        
                        <div className="flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Editar Agendamento</h1>
                            {/* Mobile Steps Indicator */}
                            <div className="md:hidden flex items-center gap-2 mt-1">
                                <div className={`flex items-center gap-1 text-xs font-medium ${step === 1 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>1</span>
                                    <span className="hidden xs:inline">Cliente</span>
                                </div>
                                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                <div className={`flex items-center gap-1 text-xs font-medium ${step === 2 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>2</span>
                                    <span className="hidden xs:inline">Agendamento</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna Esquerda - Informações do Cliente (Desktop sempre visível, Mobile Step 1) */}
                    <div className={`lg:col-span-2 ${step === 2 && isMobile ? 'hidden' : ''}`}>
                            {errorMessage && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
                                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                </div>
                            )}

                        {/* Client Information Card */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="person" className="text-primary text-xl" />
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Informações do Cliente</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="block space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Nome do Cliente</p>
                                    <input 
                                        type="text"
                                        required
                                        autoFocus
                                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                        placeholder="Digite o nome do cliente"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        onBlur={() => setClientName(capitalizeName(clientName))}
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        WhatsApp <span className="text-gray-500 text-xs">(Opcional)</span>
                                    </p>
                                    <input 
                                        type="tel"
                                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                        placeholder="(87) 9 9155-6444"
                                        value={whatsapp}
                                        onChange={handleWhatsAppChange}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Mobile Continue Button */}
                        {isMobile && step === 1 && (
                            <div className="mt-6 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => navigate(-1)}
                                    className="flex-1 px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleNextStep}
                                    disabled={!clientName || !clientName.trim()}
                                    className="flex-1 px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>Continuar</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                        </div>
                    )}
                    </div>

                    {/* Coluna Direita - Data e Horários (Desktop sempre visível, Mobile Step 2) */}
                    <div className={`lg:col-span-1 ${step === 1 && isMobile ? 'hidden' : ''}`}>
                        <div className="sticky top-24 bg-white dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-lg space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Icon name="event" className="text-primary text-xl" />
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Agendamento</h2>
                                </div>
                                {time && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        <Icon name="check_circle" className="text-sm" />
                                        Selecionado
                                    </span>
                            )}
                            </div>

                            {/* Date Selection */}
                            <div className="space-y-3">
                                <label className="block space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Icon name="calendar_today" className="text-gray-400 text-base" />
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Data do Agendamento</p>
                                    </div>
                                    <input 
                                        type="date"
                                        required
                                        min={getTodayLocalDate()}
                                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            setTime('');
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Available Times */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Icon name="schedule" className="text-gray-400 text-base" />
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Horários Disponíveis</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_TIMES.map((availableTime) => {
                                        const isPast = isTimeInPast(date, availableTime);
                                        const isBooked = !isTimeSlotAvailable(date, availableTime);
                                        const isSelected = time === availableTime;
                                        const isDisabled = isPast || isBooked;
                                        
                                        return (
                                            <button
                                                key={availableTime}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => setTime(availableTime)}
                                                className={`h-10 rounded-lg font-medium text-sm transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                                                        : isDisabled
                                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 border border-gray-200 dark:border-gray-700'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                                }`}
                                            >
                                                {availableTime}
                                                {isPast && (
                                                    <span className="block text-xs mt-0.5">
                                                        Passou
                                                    </span>
                                                )}
                                                {isBooked && !isPast && (
                                                    <span className="block text-xs mt-0.5">
                                                        Ocupado
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Summary and Confirm Button (Desktop) */}
                            <div className="hidden lg:block pt-5 border-t border-gray-200 dark:border-gray-800 space-y-4">
                                {/* Selected Info Summary */}
                                {clientName && (
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                            <span>Cliente:</span>
                                            <span className="font-medium text-gray-900 dark:text-white truncate ml-2">{clientName}</span>
                                        </div>
                                        {time && (
                                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                <span>Horário:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{time}</span>
                                            </div>
                                        )}
                        </div>
                    )}

                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !clientName.trim() || !time}
                                    className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-lg" />
                                            <span>Confirmar Alterações</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Mobile Action Buttons (Step 2) */}
                            {isMobile && step === 2 && (
                                <div className="pt-5 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={handlePrevStep}
                                        className="flex-1 px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Icon name="arrow_back" className="text-base" />
                                    <span>Voltar</span>
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !time}
                                        className="flex-1 px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-base" />
                                            <span>Confirmar</span>
                                        </>
                                    )}
                                </button>
                                </div>
                        )}
                        </div>
                    </div>
                </form>
            </main>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                
                /* Ajustes para telas de desktop (otimização de espaço) */
                @media (min-width: 1280px) {
                    main {
                        padding-top: 1rem !important;
                        padding-bottom: 1rem !important;
                    }
                    
                    header {
                        padding-top: 0.5rem !important;
                        padding-bottom: 0.5rem !important;
                    }
                    
                    .rounded-xl {
                        padding: 0.875rem !important;
                    }
                }
                
                /* Específico para telas 1024x600 e similares */
                @media (min-width: 1024px) and (max-width: 1280px) and (max-height: 700px) {
                    main {
                        padding: 0.5rem 1rem !important;
                    }
                    
                    header {
                        padding: 0.4rem 0 !important;
                    }
                    
                    header h1 {
                        font-size: 1rem !important;
                    }
                    
                    .lg\\:col-span-1 .rounded-2xl {
                        padding: 0.75rem !important;
                    }
                    
                    .lg\\:col-span-1 h2 {
                        font-size: 0.875rem !important;
                    }
                    
                    .lg\\:col-span-1 .text-sm {
                        font-size: 0.75rem !important;
                    }
                    
                    .lg\\:col-span-1 .space-y-5 > * + * {
                        margin-top: 0.75rem !important;
                    }
                    
                    .lg\\:col-span-1 .space-y-3 > * + * {
                        margin-top: 0.5rem !important;
                    }
                    
                    .lg\\:col-span-2 .rounded-xl {
                        padding: 0.75rem !important;
                    }
                    
                    /* Ocultar badge "Selecionado" em telas pequenas */
                    .lg\\:col-span-1 .bg-primary\\/10 {
                        display: none !important;
                    }
                    
                    /* Header do card mais compacto */
                    .lg\\:col-span-1 .pb-4 {
                        padding-bottom: 0.5rem !important;
                    }
                    
                    .lg\\:col-span-1 .flex.items-center.justify-between {
                        justify-content: flex-start !important;
                    }
                }
            `}</style>
        </div>
    );
};
