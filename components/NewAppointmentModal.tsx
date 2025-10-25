import React, { useState, useEffect } from 'react';
import { useAppointments } from '../contexts.tsx';
import { Appointment } from '../types.ts';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    initialDate?: string;
    initialAppointment?: Appointment; // For editing mode
}

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined !text-2xl">{name}</span>;

const AVAILABLE_TIMES = ['08:00', '10:00', '14:00', '16:00'];

// Helper function to format WhatsApp number
const formatWhatsApp = (value: string): string => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 11 digits (DDD + 9 digits)
    const limited = numbers.slice(0, 11);
    
    // Apply mask: (XX) X XXXX-XXXX
    if (limited.length <= 2) return limited;
    if (limited.length <= 3) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3, 7)}-${limited.slice(7)}`;
};

// Helper function to normalize time format (remove seconds if present)
const normalizeTime = (time: string): string => {
    if (time.includes(':') && time.split(':').length === 3) {
        return time.substring(0, 5); // Remove seconds (e.g., "14:00:00" -> "14:00")
    }
    return time;
};

// Helper function to check if a time is in the past for the selected date
const isTimeInPast = (date: string, time: string): boolean => {
    const now = new Date();
    const normalizedTime = normalizeTime(time);
    const selectedDateTime = new Date(`${date}T${normalizedTime}:00`);
    return selectedDateTime < now;
};

// Helper function to capitalize name
const capitalizeName = (name: string): string => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSave, initialDate, initialAppointment }) => {
    const { appointments } = useAppointments();
    const [currentStep, setCurrentStep] = useState(1);
    const [clientName, setClientName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const resetForm = () => {
        setCurrentStep(1);
        setClientName('');
        setWhatsapp('');
        setDate(initialDate || new Date().toISOString().split('T')[0]);
        setTime('');
        setErrorMessage('');
    };
    
    useEffect(() => {
        if (isOpen) {
            if (initialAppointment) {
                // Pre-fill form with existing appointment data (edit mode)
                setDate(initialAppointment.date);
                setTime(normalizeTime(initialAppointment.time));
                
                // Extract client name and WhatsApp
                if (initialAppointment.clientName.includes('|')) {
                    const [name, phone] = initialAppointment.clientName.split('|');
                    setClientName(name);
                    setWhatsapp(phone);
                } else if (initialAppointment.clientName.includes('(')) {
                    const match = initialAppointment.clientName.match(/^(.+?)\s*\((.+?)\)$/);
                    if (match) {
                        setClientName(match[1].trim());
                        setWhatsapp(match[2].trim());
                    } else {
                        setClientName(initialAppointment.clientName);
                    }
                } else {
                    setClientName(initialAppointment.clientName);
                }
            } else {
                // New appointment mode
                setDate(initialDate || new Date().toISOString().split('T')[0]);
                resetForm();
            }
            setCurrentStep(1);
        }
    }, [isOpen, initialDate, initialAppointment]);

    // Check if a time slot is available
    const isTimeAvailable = (selectedDate: string, selectedTime: string): boolean => {
        const normalizedSelectedTime = normalizeTime(selectedTime);
        const isPast = isTimeInPast(selectedDate, selectedTime);
        const isBooked = appointments.some(
            apt => apt.date === selectedDate && normalizeTime(apt.time) === normalizedSelectedTime
        );
        return !isPast && !isBooked;
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsapp(formatted);
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    const handleNextStep = () => {
        setErrorMessage(''); // Clear any previous errors
        if (currentStep === 1 && clientName.trim()) {
            // Validate WhatsApp if provided
            if (whatsapp) {
                const numbers = whatsapp.replace(/\D/g, '');
                if (numbers.length < 11) {
                    setErrorMessage("Por favor, insira um número de WhatsApp válido com DDD e 9 dígitos.");
                    return;
                }
            }
            setCurrentStep(2);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setErrorMessage(''); // Clear any previous errors
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(''); // Clear any previous errors
        
        if (!time) {
            setErrorMessage("Por favor, selecione um horário!");
            return;
        }

        if (!isTimeAvailable(date, time)) {
            setErrorMessage("Este horário não está mais disponível. Por favor, escolha outro.");
            return;
        }

        try {
            // Store client name and WhatsApp separately using a separator
            const clientNameWithWhatsApp = whatsapp 
                ? `${clientName}|${whatsapp}`
                : clientName;
                
            await onSave({
                clientName: clientNameWithWhatsApp,
                service: 'Aguardando atendimento',
                date,
                time,
            });
            resetForm();
            onClose();
        } catch (error: any) {
            console.error("Failed to save appointment:", error);
            setErrorMessage(`Falha ao salvar agendamento: ${error.message || 'Erro desconhecido.'}`);
        }
    };
    
    const handleModalContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl"
                onClick={handleModalContentClick}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Novo Agendamento</p>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center py-4 border-b border-gray-200 dark:border-white/10">
                        <div className="flex items-center space-x-4">
                            {[1, 2].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        step <= currentStep 
                                            ? 'bg-primary text-white' 
                                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        {step}
                                    </div>
                                    {step < 2 && (
                                        <div className={`w-12 h-0.5 mx-2 ${
                                            step < currentStep ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 p-5">
                        {errorMessage && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                            </div>
                        )}
                        {/* Step 1: Client Information */}
                        {currentStep === 1 && (
                            <>
                                <label className="flex flex-col">
                                    <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Nome do Cliente</p>
                                    <input 
                                        required
                                        autoFocus
                                        className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                        placeholder="Digite o nome do cliente"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        onBlur={() => setClientName(capitalizeName(clientName))}
                                    />
                                </label>

                                <label className="flex flex-col">
                                    <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                                        WhatsApp <span className="text-gray-500 text-sm">(Opcional)</span>
                                    </p>
                                    <input 
                                        type="tel"
                                        className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                        placeholder="(87) 9 9155-6444"
                                        value={whatsapp}
                                        onChange={handleWhatsAppChange}
                                    />
                                </label>
                            </>
                        )}

                        {/* Step 2: Date and Time */}
                        {currentStep === 2 && (
                            <>
                                <label className="flex flex-col">
                                    <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Data</p>
                                    <input 
                                        required
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            setTime(''); // Reset time when date changes
                                        }}
                                    />
                                </label>

                                <div>
                                    <p className="pb-3 text-base font-medium text-gray-800 dark:text-gray-100">Horários Disponíveis</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {AVAILABLE_TIMES.map((availableTime) => {
                                            const available = isTimeAvailable(date, availableTime);
                                            const isSelected = time === availableTime;
                                            const isPast = isTimeInPast(date, availableTime);
                                            
                                            return (
                                                <button
                                                    key={availableTime}
                                                    type="button"
                                                    disabled={!available}
                                                    onClick={() => setTime(availableTime)}
                                                    className={`h-12 rounded-lg font-medium text-base transition-all ${
                                                        isSelected
                                                            ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                                                            : available
                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 border border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    {availableTime}
                                                    {!available && (
                                                        <span className="block text-xs mt-1">
                                                            {isPast ? 'Horário já passou' : 'Indisponível'}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 sm:flex-row sm:justify-between dark:border-white/10">
                        <button 
                            type="button" 
                            onClick={currentStep === 1 ? onClose : handlePrevStep} 
                            className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark"
                        >
                            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
                        </button>
                        
                        {currentStep === 1 ? (
                            <button 
                                type="button"
                                onClick={handleNextStep}
                                disabled={!clientName.trim()}
                                className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                            >
                                Próximo
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                disabled={!time}
                                className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark"
                            >
                                Confirmar Agendamento
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
