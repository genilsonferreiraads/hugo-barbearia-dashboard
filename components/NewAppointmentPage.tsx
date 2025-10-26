import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment } from '../types.ts';
import { useAppointments } from '../contexts.tsx';

interface NewAppointmentPageProps {
    onSave: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    initialDate?: string;
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

const formatWhatsApp = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    
    if (limited.length <= 2) return limited;
    if (limited.length <= 3) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3, 7)}-${limited.slice(7)}`;
};

const capitalizeName = (name: string): string => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const NewAppointmentPage: React.FC<NewAppointmentPageProps> = ({ onSave, initialDate }) => {
    const navigate = useNavigate();
    const { appointments } = useAppointments();
    const [step, setStep] = useState(1);
    const [clientName, setClientName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Function to check if a time slot is available for a given date
    const isTimeSlotAvailable = (selectedDate: string, selectedTime: string): boolean => {
        const normalizedTime = normalizeTime(selectedTime);
        const isBooked = appointments.some(apt => {
            const aptNormalizedTime = normalizeTime(apt.time);
            return apt.date === selectedDate && aptNormalizedTime === normalizedTime;
        });
        return !isBooked;
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsapp(formatted);
    };

    const handleNextStep = () => {
        setErrorMessage('');
        if (step === 1 && clientName.trim()) {
            if (whatsapp) {
                const numbers = whatsapp.replace(/\D/g, '');
                if (numbers.length < 11) {
                    setErrorMessage("Por favor, insira um número de WhatsApp válido com DDD e 9 dígitos.");
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

        // Check if the time slot is already booked
        if (!isTimeSlotAvailable(date, time)) {
            setErrorMessage("Este horário já está ocupado nesta data. Por favor, escolha outro horário.");
            return;
        }

        try {
            setIsSubmitting(true);
            const clientNameWithWhatsApp = whatsapp 
                ? `${clientName}|${whatsapp}`
                : clientName;
                
            await onSave({
                clientName: clientNameWithWhatsApp,
                service: 'Aguardando atendimento',
                date,
                time,
            });
            navigate(-1);
        } catch (error: any) {
            console.error("Failed to save appointment:", error);
            setErrorMessage(`Falha ao salvar agendamento: ${error.message || 'Erro desconhecido.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progressPercentage = (step / 2) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-light to-gray-50 dark:from-background-dark dark:to-gray-900 flex flex-col">
            {/* Header with Back Button and Progress */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="text-xs font-medium">Voltar</span>
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Novo Agendamento</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 2</p>
                        </div>
                        
                        <div className="w-16" />
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Client Information */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            {errorMessage && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                </div>
                            )}

                            {/* Client Name */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
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
                    )}

                    {/* Step 2: Date and Time */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            {errorMessage && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                </div>
                            )}

                            {/* Date */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                                <label className="block space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Data</p>
                                    <input 
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            setTime('');
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Available Times */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Horários Disponíveis</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex gap-3 sm:justify-end flex-wrap sm:flex-nowrap">
                        {step === 1 && (
                            <>
                                <button 
                                    type="button" 
                                    onClick={() => navigate(-1)}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleNextStep}
                                    disabled={!clientName.trim()}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>Continuar</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <button 
                                    type="button" 
                                    onClick={handlePrevStep}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Icon name="arrow_back" className="text-base" />
                                    <span>Voltar</span>
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !time}
                                    className="flex-1 sm:flex-auto px-6 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            <span>Agendando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-base" />
                                            <span>Confirmar</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
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
            `}</style>
        </div>
    );
};
