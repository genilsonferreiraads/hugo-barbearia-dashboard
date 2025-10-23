import React, { useState, useMemo } from 'react';
import { NewAppointmentModal } from './NewAppointmentModal.tsx';
import { useAppointments } from '../contexts.tsx';
import { Appointment } from '../types.ts';

// --- Date Helper Functions ---
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const areDatesEqual = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const SchedulePage: React.FC = () => {
    const [view, setView] = useState('Semana');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { appointments, addAppointment } = useAppointments();

    const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
        await addAppointment(appointmentData);
    };

    const handlePrev = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'Semana') {
                newDate.setDate(newDate.getDate() - 7);
            } else {
                newDate.setDate(newDate.getDate() - 1);
            }
            return newDate;
        });
    };
    
    const handleNext = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'Semana') {
                newDate.setDate(newDate.getDate() + 7);
            } else {
                newDate.setDate(newDate.getDate() + 1);
            }
            return newDate;
        });
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const { weekDays, currentMonthLabel } = useMemo(() => {
        const startOfWeek = getStartOfWeek(currentDate);
        const days = Array.from({ length: 5 }).map((_, i) => addDays(startOfWeek, i)); // Mon-Fri
        const monthLabel = startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { weekDays: days, currentMonthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
    }, [currentDate]);

    const appointmentsByDateAndTime = useMemo(() => {
        const map = new Map<string, Appointment>();
        appointments.forEach(app => {
            const key = `${app.date}_${app.time}`;
            map.set(key, app);
        });
        return map;
    }, [appointments]);

    const renderWeekView = () => (
        <div className="min-w-[1000px]">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-28">Horário</th>
                        {weekDays.map(day => (
                            <th key={day.toISOString()} className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                <div className={`flex items-center gap-2 ${areDatesEqual(day, new Date()) ? 'text-primary' : ''}`}>
                                    <span>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                                    <span>{day.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {timeSlots.map(time => (
                        <tr key={time}>
                            <td className="h-[72px] px-4 py-2 align-top pt-4 text-sm font-medium text-gray-400 dark:text-gray-500">{time}</td>
                            {time === "12:00" ? (
                                <td className="h-[72px] px-4 py-2 text-center text-gray-400 bg-gray-50 dark:bg-gray-900/70 text-sm" colSpan={5}>Almoço</td>
                            ) : (
                                weekDays.map(date => {
                                    const dateStr = formatDateYYYYMMDD(date);
                                    const appointment = appointmentsByDateAndTime.get(`${dateStr}_${time}`);
                                    return (
                                        <td key={`${time}-${dateStr}`} className="h-[72px] px-4 py-2 align-middle">
                                            {appointment ? (
                                                <button className="flex w-full min-w-[84px] items-center justify-start overflow-hidden rounded-lg h-12 px-3 bg-primary text-white text-sm font-medium shadow-sm text-left">
                                                  <span className="truncate">{appointment.clientName} - {appointment.service}</span>
                                                </button>
                                            ) : <div className="h-12 w-full"></div>}
                                        </td>
                                    );
                                })
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderDayView = () => {
        const todayAppointments = appointments.filter(app => app.date === formatDateYYYYMMDD(currentDate));

        return (
             <div className="min-w-full">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-28">Horário</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                 <div className={`flex items-center gap-2 ${areDatesEqual(currentDate, new Date()) ? 'text-primary' : ''}`}>
                                    <span>{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {timeSlots.map(time => {
                            const appointment = todayAppointments.find(app => app.time === time);
                             return (
                                <tr key={time}>
                                    <td className="h-[72px] px-4 py-2 align-middle text-sm font-medium text-gray-400 dark:text-gray-500">{time}</td>
                                    {time === "12:00" ? (
                                        <td className="h-[72px] px-4 py-2 text-center text-gray-400 bg-gray-50 dark:bg-gray-900/70 text-sm">Almoço</td>
                                    ) : (
                                        <td className="h-[72px] px-4 py-2 align-middle">
                                             {appointment ? (
                                                <button className="flex w-full min-w-[84px] items-center justify-start overflow-hidden rounded-lg h-12 px-3 bg-primary text-white text-sm font-medium shadow-sm text-left">
                                                  <span className="truncate">{appointment.clientName} - {appointment.service}</span>
                                                </button>
                                            ) : <div className="h-12 w-full"></div>}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Agenda</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:focus:ring-offset-background-dark transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span>Novo Agendamento</span>
                </button>
            </header>
            
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-1">
                        <button onClick={handlePrev} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Anterior">
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button onClick={handleNext} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Próximo">
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                    <button onClick={handleToday} className="h-10 px-4 rounded-lg text-sm font-medium bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Hoje</button>
                </div>
                
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{currentMonthLabel}</p>
                
                <div className="flex h-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800/70 p-1">
                    {['Dia', 'Semana'].map(v => (
                         <label key={v} className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-4 has-[:checked]:bg-white dark:has-[:checked]:bg-gray-900 has-[:checked]:shadow-sm has-[:checked]:text-gray-900 dark:has-[:checked]:text-white text-gray-600 dark:text-gray-400">
                             <span className="truncate text-sm font-medium">{v}</span>
                             <input className="sr-only" name="view-switcher" type="radio" value={v} checked={view === v} onChange={() => setView(v)}/>
                         </label>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                {view === 'Semana' ? renderWeekView() : renderDayView()}
            </div>
            <NewAppointmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveAppointment}
                initialDate={formatDateYYYYMMDD(currentDate)}
            />
        </div>
    );
};
