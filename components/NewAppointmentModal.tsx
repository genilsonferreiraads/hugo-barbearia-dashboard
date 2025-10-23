import React, { useState, useEffect } from 'react';
import { useServices } from '../contexts.tsx';
import { Service, Appointment, AppointmentStatus } from '../types.ts';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    initialDate?: string;
}

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined !text-2xl">{name}</span>;

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSave, initialDate }) => {
    const { services } = useServices();
    const [clientName, setClientName] = useState('');
    const [serviceId, setServiceId] = useState<number | ''>(services[0]?.id || '');
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('10:00');

    const resetForm = () => {
        setClientName('');
        setServiceId(services[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('10:00');
    };
    
    useEffect(() => {
        if (isOpen) {
            setDate(initialDate || new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, initialDate]);
    
    useEffect(() => {
        if (!serviceId && services.length > 0) {
            setServiceId(services[0].id);
        }
    }, [services, serviceId]);


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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedService = services.find(s => s.id === serviceId);
        if (!selectedService) {
            alert("Serviço inválido!");
            return;
        }
        try {
            await onSave({
                clientName,
                service: selectedService.name,
                date,
                time,
            });
            resetForm();
            onClose();
        } catch (error: any) {
            console.error("Failed to save appointment:", error);
            alert(`Falha ao salvar agendamento: ${error.message || 'Erro desconhecido.'}`);
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
                    <div className="flex flex-col gap-6 p-5">
                        <label className="flex flex-col">
                            <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Nome do Cliente</p>
                            <input 
                                required
                                autoFocus
                                className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                placeholder="Digite o nome do cliente"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                            />
                        </label>

                        <label className="flex flex-col">
                            <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Serviço</p>
                             <select
                                required
                                value={serviceId}
                                onChange={(e) => setServiceId(Number(e.target.value))}
                                className="form-select h-12 w-full min-w-0 rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-primary"
                            >
                                {services.map((service: Service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - R$ {service.price.toFixed(2).replace('.', ',')}
                                    </option>
                                ))}
                            </select>
                        </label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <label className="flex flex-col">
                                <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Data</p>
                                <input 
                                    required
                                    type="date"
                                    className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </label>
                             <label className="flex flex-col">
                                <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Horário</p>
                                <input 
                                    required
                                    type="time"
                                    className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </label>
                        </div>

                    </div>
                    
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 sm:flex-row sm:justify-end dark:border-white/10">
                        <button type="button" onClick={onClose} className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark">Cancelar</button>
                        <button type="submit" className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark">Confirmar Agendamento</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
