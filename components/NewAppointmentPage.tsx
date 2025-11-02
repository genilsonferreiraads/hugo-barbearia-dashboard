import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, Client } from '../types.ts';
import { useAppointments, useClients } from '../contexts.tsx';
import { ClientSearchField } from './ClientSearchField.tsx';

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

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getTodayLocalDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const NewAppointmentPage: React.FC<NewAppointmentPageProps> = ({ onSave, initialDate }) => {
    const navigate = useNavigate();
    const { appointments } = useAppointments();
    const { clients } = useClients();
    const [step, setStep] = useState(1);
    const [clientName, setClientName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [date, setDate] = useState(initialDate || getTodayLocalDate());
    const [time, setTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState<{ clientName: string; date: string; time: string } | null>(null);
    const whatsappInputRef = React.useRef<HTMLInputElement>(null);

    // Wait for appointments to update and show the receipt modal
    useEffect(() => {
        if (newAppointmentData) {
            const foundAppointment = appointments.find(apt => 
                apt.clientName === newAppointmentData.clientName && 
                apt.date === newAppointmentData.date && 
                normalizeTime(apt.time) === normalizeTime(newAppointmentData.time)
            );
            
            if (foundAppointment) {
                // Navigate to receipt page
                navigate(`/appointment-receipt?id=${foundAppointment.id}`);
                setNewAppointmentData(null);
            }
        }
    }, [appointments, newAppointmentData, navigate]);

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
        
        // Verificar se há nome digitado (mesmo que não esteja salvo na base)
        const hasName = clientName && clientName.trim().length > 0;
        
        if (step === 1 && hasName) {
            // WhatsApp é opcional - apenas validar se foi preenchido
            if (whatsapp && whatsapp.trim()) {
                const numbers = whatsapp.replace(/\D/g, '');
                if (numbers.length < 10 || numbers.length > 11) {
                    setErrorMessage("Por favor, insira um número de WhatsApp válido com DDD (10 ou 11 dígitos).");
                    return;
                }
            }
            // Pode prosseguir mesmo sem salvar o cliente na base de dados
            setStep(2);
        } else {
            if (!hasName) {
                setErrorMessage("Por favor, informe o nome do cliente.");
            }
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
                service: '',
                date,
                time,
                clientId: selectedClient?.id, // Incluir clientId se cliente foi selecionado da base
            });
            
            // Store the data and wait for appointments to update via useEffect
            setNewAppointmentData({
                clientName: clientNameWithWhatsApp,
                date,
                time,
            });
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
                <div className="max-w-md mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm shrink-0 mt-0.5"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span className="font-medium hidden sm:inline">Voltar</span>
                        </button>
                        
                        <div className="text-center flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">Novo Agendamento</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Passo {step} de 2</p>
                        </div>
                        
                        <div className="w-10 sm:w-16" />
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
            <main className="flex-1 max-w-md w-full mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Client Information */}
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            {errorMessage && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                </div>
                            )}

                            {/* Client Name */}
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-2.5">
                                <label className="block space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Nome do Cliente</p>
                                    <ClientSearchField
                                        onSelectClient={(client) => {
                                            setSelectedClient(client);
                                            if (client) {
                                                setClientName(client.fullName);
                                                setWhatsapp(client.whatsapp);
                                            } else {
                                                // Não limpar clientName aqui - permitir que o usuário continue com o nome digitado
                                                // setClientName('');
                                                // setWhatsapp('');
                                            }
                                        }}
                                        onValueChange={(name) => {
                                            // SEMPRE atualizar clientName quando o valor muda
                                            setClientName(name);
                                            // Se limpar o campo, limpar seleção e WhatsApp
                                            if (!name.trim()) {
                                                setSelectedClient(null);
                                                setWhatsapp('');
                                            } else {
                                                // Se está digitando um nome novo, manter o nome mas limpar seleção
                                                // Isso permite que o usuário continue sem salvar o cliente
                                                const found = clients.find(c => 
                                                    c.fullName.toLowerCase() === name.toLowerCase()
                                                );
                                                if (!found) {
                                                    setSelectedClient(null);
                                                    // Não limpar whatsapp aqui - deixar o usuário preencher se quiser
                                                }
                                            }
                                        }}
                                        value={clientName}
                                        placeholder="Digite o nome do cliente"
                                        className="w-full"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        WhatsApp <span className="text-gray-500 text-xs">(Opcional)</span>
                                    </p>
                                    <input 
                                        ref={whatsappInputRef}
                                        type="tel"
                                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-3 focus:ring-primary/20 transition-all"
                                        placeholder="(87) 9 9155-6444"
                                        value={whatsapp}
                                        onChange={handleWhatsAppChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (clientName.trim()) {
                                                    handleNextStep();
                                                }
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date and Time */}
                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
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
                                        min={getTodayLocalDate()}
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
                            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-2.5">
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
                    <div className="mt-6 flex gap-3 sm:justify-end flex-wrap sm:flex-nowrap">
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
                                    disabled={!clientName || !clientName.trim()}
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

            {/* The AppointmentReceiptModal component is no longer needed as it's a full page navigation */}
        </div>
    );
};
