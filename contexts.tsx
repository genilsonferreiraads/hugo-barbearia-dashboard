import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { Service, Appointment, AppointmentStatus, Transaction } from './types.ts';
import { supabase } from './services/supabaseClient.ts';

// --- THEME CONTEXT ---
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (storedTheme as Theme) || (prefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// --- SERVICES CONTEXT ---
interface ServicesContextType {
    services: Service[];
    addService: (service: Omit<Service, 'id' | 'created_at'>) => Promise<void>;
    updateService: (updatedService: Service) => Promise<void>;
    deleteService: (serviceId: number) => Promise<void>;
}
const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const useServices = () => {
    const context = useContext(ServicesContext);
    if(!context) throw new Error('useServices must be used within a ServicesProvider');
    return context;
}

export const ServicesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [services, setServices] = useState<Service[]>([]);

    const fetchServices = useCallback(async () => {
        const { data, error } = await supabase.from('services').select('*').order('name');
        if (error) console.error('Error fetching services:', error);
        else setServices(data || []);
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const addService = useCallback(async (service: Omit<Service, 'id' | 'created_at'>) => {
        const { data, error } = await supabase.from('services').insert([service]).select();
        if (error) {
            console.error('Error adding service:', error);
            throw error;
        }
        if (data) {
            setServices(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, []);

    const updateService = useCallback(async (updatedService: Service) => {
        const { id, ...serviceData } = updatedService;
        const { data, error } = await supabase.from('services').update(serviceData).eq('id', id).select();
        if (error) {
            console.error('Error updating service:', error);
            throw error;
        }
        if(data) {
            setServices(prev => prev.map(s => s.id === id ? data[0] : s));
        }
    }, []);

    const deleteService = useCallback(async (serviceId: number) => {
        const { error } = await supabase.from('services').delete().eq('id', serviceId);
        if (error) {
            console.error('Error deleting service:', error);
            throw error;
        }
        else {
            setServices(prev => prev.filter(s => s.id !== serviceId));
        }
    }, []);

    const value = useMemo(() => ({ services, addService, updateService, deleteService }), [services, addService, updateService, deleteService]);
    
    return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

// --- TRANSACTIONS CONTEXT ---
interface TransactionsContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
}
const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const useTransactions = () => {
    const context = useContext(TransactionsContext);
    if (!context) throw new Error('useTransactions must be used within a TransactionsProvider');
    return context;
};

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const fetchTransactions = useCallback(async () => {
        const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) console.error('Error fetching transactions:', error);
        else {
            const mappedData = data?.map(({ clientname, paymentmethod, ...rest }) => ({
                ...rest,
                clientName: clientname,
                paymentMethod: paymentmethod,
            })) || [];
            setTransactions(mappedData);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);


    const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'created_at'>) => {
        const newTransactionData = {
            clientname: transactionData.clientName,
            service: transactionData.service,
            date: transactionData.date,
            paymentmethod: transactionData.paymentMethod,
            subtotal: transactionData.subtotal,
            discount: transactionData.discount,
            value: transactionData.value,
        };
        const { data, error } = await supabase.from('transactions').insert([newTransactionData]).select();
        if (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
        if(data) {
            const { clientname, paymentmethod, ...rest } = data[0];
            const mappedTransaction = { ...rest, clientName: clientname, paymentMethod: paymentmethod };
            setTransactions(prev => [mappedTransaction, ...prev]);
        }
    }, []);

    const value = useMemo(() => ({ transactions, addTransaction }), [transactions, addTransaction]);

    return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

// --- APPOINTMENTS CONTEXT ---
interface AppointmentsContextType {
    appointments: Appointment[];
    addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    updateAppointmentStatus: (appointmentId: number, status: AppointmentStatus) => Promise<void>;
}
const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export const useAppointments = () => {
    const context = useContext(AppointmentsContext);
    if (!context) throw new Error('useAppointments must be used within a AppointmentsProvider');
    return context;
};

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    const fetchAppointments = useCallback(async () => {
        const { data, error } = await supabase.from('appointments').select('*').order('date').order('time');
        if (error) console.error('Error fetching appointments:', error);
        else {
            const mappedData = data?.map(({ clientname, ...rest }) => ({
                ...rest,
                clientName: clientname,
            })) || [];
            setAppointments(mappedData);
        }
    }, []);
    
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);


    const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
        const newAppointmentData = {
            clientname: appointmentData.clientName,
            service: appointmentData.service,
            date: appointmentData.date,
            time: appointmentData.time,
            status: AppointmentStatus.Confirmed,
        };
        const { data, error } = await supabase.from('appointments').insert([newAppointmentData]).select();
        
        if (error) {
            console.error('Error adding appointment:', error);
            throw error;
        }
        if (data) {
            const { clientname, ...rest } = data[0];
            const mappedAppointment = { ...rest, clientName: clientname };
            setAppointments(prev => [...prev, mappedAppointment]);
        }
    }, []);

    const updateAppointmentStatus = useCallback(async (appointmentId: number, status: AppointmentStatus) => {
        const { data, error } = await supabase.from('appointments').update({ status }).eq('id', appointmentId).select();

        if (error) {
            console.error('Error updating appointment status:', error);
            throw error;
        }
        if (data) {
            const { clientname, ...rest } = data[0];
            const mappedAppointment = { ...rest, clientName: clientname };
            setAppointments(prev => prev.map(app => 
                app.id === appointmentId ? mappedAppointment : app
            ));
        }
    }, []);

    const value = useMemo(() => ({ appointments, addAppointment, updateAppointmentStatus }), [appointments, addAppointment, updateAppointmentStatus]);

    return <AppointmentsContext.Provider value={value}>{children}</AppointmentsContext.Provider>;
};
