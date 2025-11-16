import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, useRef } from 'react';
import { Service, Product, Appointment, AppointmentStatus, Transaction, CreditSale, Installment, InstallmentStatus, CreditSaleStatus, SystemSettings, Client, Expense, ExpenseCategory } from './types.ts';
import { supabase } from './services/supabaseClient.ts';
import type { User, Session } from '@supabase/supabase-js';

// --- AUTH CONTEXT ---
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signOut,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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

// --- PRODUCTS CONTEXT ---
interface ProductsContextType {
    products: Product[];
    addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
    updateProduct: (updatedProduct: Product) => Promise<void>;
    deleteProduct: (productId: number) => Promise<void>;
}
const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const useProducts = () => {
    const context = useContext(ProductsContext);
    if(!context) throw new Error('useProducts must be used within a ProductsProvider');
    return context;
}

export const ProductsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);

    const fetchProducts = useCallback(async () => {
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (error) console.error('Error fetching products:', error);
        else setProducts(data || []);
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const addProduct = useCallback(async (product: Omit<Product, 'id' | 'created_at'>) => {
        const { data, error } = await supabase.from('products').insert([product]).select();
        if (error) {
            console.error('Error adding product:', error);
            throw error;
        }
        if (data) {
            setProducts(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, []);

    const updateProduct = useCallback(async (updatedProduct: Product) => {
        const { id, ...productData } = updatedProduct;
        const { data, error } = await supabase.from('products').update(productData).eq('id', id).select();
        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }
        if(data) {
            setProducts(prev => prev.map(p => p.id === id ? data[0] : p));
        }
    }, []);

    const deleteProduct = useCallback(async (productId: number) => {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
        else {
            setProducts(prev => prev.filter(p => p.id !== productId));
        }
    }, []);

    const value = useMemo(() => ({ products, addProduct, updateProduct, deleteProduct }), [products, addProduct, updateProduct, deleteProduct]);
    
    return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

// --- TRANSACTIONS CONTEXT ---
interface TransactionsContextType {
    transactions: Transaction[];
    fetchTransactions: () => Promise<void>;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
    updateTransaction: (id: number, updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;
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
            const mappedData = data?.map(({ clientname, paymentmethod, type, client_id, from_appointment, ...rest }) => ({
                ...rest,
                clientName: clientname,
                paymentMethod: paymentmethod,
                type: type || 'service',
                clientId: client_id || undefined,
                fromAppointment: from_appointment || false,
            })) || [];
            setTransactions(mappedData);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
        
        // Ouvir evento de atualização de cliente para recarregar transações
        const handleClientUpdated = () => {
            fetchTransactions();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchTransactions]);


    const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'created_at'>) => {
        const newTransactionData: any = {
            clientname: transactionData.clientName,
            service: transactionData.service,
            date: transactionData.date,
            paymentmethod: transactionData.paymentMethod,
            subtotal: transactionData.subtotal,
            discount: transactionData.discount,
            value: transactionData.value,
        };
        
        // Se o transactionData tem clientId, incluir na inserção
        if ('clientId' in transactionData && transactionData.clientId) {
            newTransactionData.client_id = transactionData.clientId;
        }
        
        // Se o transactionData tem type, incluir na inserção
        if ('type' in transactionData && transactionData.type) {
            newTransactionData.type = transactionData.type;
        }
        
        // Se o transactionData tem fromAppointment, incluir na inserção
        if ('fromAppointment' in transactionData) {
            newTransactionData.from_appointment = transactionData.fromAppointment;
        }
        
        const { data, error } = await supabase.from('transactions').insert([newTransactionData]).select();
        if (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
        if(data) {
            const { clientname, paymentmethod, type, client_id, from_appointment, ...rest } = data[0];
            const mappedTransaction = { 
                ...rest, 
                clientName: clientname, 
                paymentMethod: paymentmethod, 
                type: type || 'service', 
                clientId: client_id || undefined,
                fromAppointment: from_appointment || false
            };
            setTransactions(prev => [mappedTransaction, ...prev]);
        }
    }, []);

    const updateTransaction = useCallback(async (id: number, updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => {
        const updateData: Record<string, any> = {};
        if (updates.clientName !== undefined) updateData.clientname = updates.clientName;
        if (updates.service !== undefined) updateData.service = updates.service;
        if (updates.date !== undefined) updateData.date = updates.date;
        if (updates.paymentMethod !== undefined) updateData.paymentmethod = updates.paymentMethod;
        if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
        if (updates.discount !== undefined) updateData.discount = updates.discount;
        if (updates.value !== undefined) updateData.value = updates.value;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.fromAppointment !== undefined) updateData.from_appointment = updates.fromAppointment;

        const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
        if (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    const deleteTransaction = useCallback(async (id: number) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = useMemo(() => ({ transactions, fetchTransactions, addTransaction, updateTransaction, deleteTransaction }), [transactions, fetchTransactions, addTransaction, updateTransaction, deleteTransaction]);

    return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

// --- APPOINTMENTS CONTEXT ---
interface AppointmentsContextType {
    appointments: Appointment[];
    fetchAppointments: () => Promise<void>;
    addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>;
    updateAppointmentStatus: (appointmentId: number, status: AppointmentStatus) => Promise<void>;
    deleteAppointment: (appointmentId: number) => Promise<void>;
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
        if (error) {
            console.error('Error fetching appointments:', error);
        } else {
            const mappedData = data?.map(({ clientname, client_id, ...rest }) => ({
                ...rest,
                clientName: clientname,
                clientId: client_id || undefined,
            })) || [];
            setAppointments(mappedData);
        }
    }, []);
    
    useEffect(() => {
        fetchAppointments();
        
        // Ouvir evento de atualização de cliente para recarregar agendamentos
        const handleClientUpdated = () => {
            fetchAppointments();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchAppointments]);


    const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => {
        const newAppointmentData: any = {
            clientname: appointmentData.clientName,
            service: appointmentData.service,
            date: appointmentData.date,
            time: appointmentData.time,
            status: AppointmentStatus.Confirmed,
        };
        
        // Se o appointmentData tem clientId, incluir na inserção
        if ('clientId' in appointmentData && appointmentData.clientId) {
            newAppointmentData.client_id = appointmentData.clientId;
        }
        
        const { data, error } = await supabase.from('appointments').insert([newAppointmentData]).select();
        
        if (error) {
            console.error('Error adding appointment:', error);
            throw error;
        }
        if (data) {
            const { clientname, client_id, ...rest } = data[0];
            const mappedAppointment = { ...rest, clientName: clientname, clientId: client_id || undefined };
            setAppointments(prev => [...prev, mappedAppointment]);
        }
    }, []);

    const updateAppointmentStatus = useCallback(async (appointmentId: number, status: AppointmentStatus) => {
        const statusValue = String(status); // Ensure it's a string
        
        const { data, error } = await supabase
            .from('appointments')
            .update({ status: statusValue })
            .eq('id', appointmentId)
            .select();

        if (error) {
            console.error('Error updating appointment status:', error);
            throw error;
        }
        if (data && data.length > 0) {
            const { clientname, ...rest } = data[0];
            const mappedAppointment = { ...rest, clientName: clientname };
            setAppointments(prev => prev.map(app => 
                app.id === appointmentId ? mappedAppointment : app
            ));
        }
    }, []);

    const deleteAppointment = useCallback(async (appointmentId: number) => {
        const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
        if (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
        setAppointments(prev => prev.filter(app => app.id !== appointmentId));
    }, []);

    const value = useMemo(() => ({ appointments, fetchAppointments, addAppointment, updateAppointmentStatus, deleteAppointment }), [appointments, fetchAppointments, addAppointment, updateAppointmentStatus, deleteAppointment]);

    return <AppointmentsContext.Provider value={value}>{children}</AppointmentsContext.Provider>;
};

// --- FINALIZE APPOINTMENT CONTEXT ---
interface FinalizeAppointmentContextType {
    appointment: Appointment | null;
    onFinalize: ((transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>) | null;
    redirectTo: string | null;
    setFinalizeData: (appointment: Appointment, onFinalize: (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>, redirectTo?: string) => void;
    clearFinalizeData: () => void;
}

const FinalizeAppointmentContext = createContext<FinalizeAppointmentContextType | undefined>(undefined);

export const useFinalizeAppointment = () => {
    const context = useContext(FinalizeAppointmentContext);
    if (!context) throw new Error('useFinalizeAppointment must be used within a FinalizeAppointmentProvider');
    return context;
};

export const FinalizeAppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [redirectTo, setRedirectTo] = useState<string | null>(null);
    // Use useRef to store the function directly to avoid React state update issues
    const onFinalizeRef = useRef<((transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>) | null>(null);
    const [, forceUpdate] = useState(0);

    const setFinalizeData = useCallback((apt: Appointment, handler: (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => Promise<void>, redirect?: string) => {
        setAppointment(apt);
        onFinalizeRef.current = handler; // Store handler function directly in ref
        setRedirectTo(redirect || null);
        forceUpdate(prev => prev + 1); // Force re-render to update context value
    }, []);

    const clearFinalizeData = useCallback(() => {
        setAppointment(null);
        onFinalizeRef.current = null;
        setRedirectTo(null);
        forceUpdate(prev => prev + 1);
    }, []);

    // Create a stable function that calls the ref
    const onFinalize = useCallback(async (transactionData: Omit<Transaction, 'id' | 'date' | 'created_at'>) => {
        if (!onFinalizeRef.current) {
            throw new Error('onFinalize function is not available');
        }
        
        if (typeof onFinalizeRef.current !== 'function') {
            throw new Error('onFinalize function is not a function');
        }
        
        try {
            return await onFinalizeRef.current(transactionData);
        } catch (error) {
            console.error('Error in onFinalizeRef.current:', error);
            throw error;
        }
    }, []);

    const value = useMemo(() => {
        return {
            appointment,
            onFinalize, // Always return the stable function, it will check the ref internally
            redirectTo,
            setFinalizeData,
            clearFinalizeData,
        };
    }, [appointment, onFinalize, redirectTo, setFinalizeData, clearFinalizeData]);

    return (
        <FinalizeAppointmentContext.Provider value={value}>
            {children}
        </FinalizeAppointmentContext.Provider>
    );
};

// --- EDIT TRANSACTION CONTEXT ---
interface EditTransactionContextType {
    transaction: Transaction | null;
    onSave: ((updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>) | null;
    setEditTransactionData: (transaction: Transaction, onSave: (updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>) => void;
    clearEditTransactionData: () => void;
}

const EditTransactionContext = createContext<EditTransactionContextType | undefined>(undefined);

export const useEditTransaction = () => {
    const context = useContext(EditTransactionContext);
    if (!context) throw new Error('useEditTransaction must be used within an EditTransactionProvider');
    return context;
};

export const EditTransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [onSave, setOnSave] = useState<((updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>) | null>(null);

    const setEditTransactionData = useCallback((txn: Transaction, handler: (updates: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>) => {
        setTransaction(txn);
        setOnSave(() => handler);
    }, []);

    const clearEditTransactionData = useCallback(() => {
        setTransaction(null);
        setOnSave(null);
    }, []);

    const value = useMemo(() => ({
        transaction,
        onSave,
        setEditTransactionData,
        clearEditTransactionData,
    }), [transaction, onSave, setEditTransactionData, clearEditTransactionData]);

    return (
        <EditTransactionContext.Provider value={value}>
            {children}
        </EditTransactionContext.Provider>
    );
};

// --- NEW APPOINTMENT CONTEXT ---
interface NewAppointmentContextType {
    onSave: ((appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) | null;
    initialDate: string | undefined;
    setNewAppointmentData: (onSave: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>, initialDate?: string) => void;
    clearNewAppointmentData: () => void;
}

const NewAppointmentContext = createContext<NewAppointmentContextType | undefined>(undefined);

export const useNewAppointment = () => {
    const context = useContext(NewAppointmentContext);
    if (!context) throw new Error('useNewAppointment must be used within a NewAppointmentProvider');
    return context;
};

export const NewAppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [onSave, setOnSave] = useState<((appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) | null>(null);
    const [initialDate, setInitialDate] = useState<string | undefined>();

    const setNewAppointmentData = useCallback((handler: (appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>, date?: string) => {
        setOnSave(() => handler);
        setInitialDate(date);
    }, []);

    const clearNewAppointmentData = useCallback(() => {
        setOnSave(null);
        setInitialDate(undefined);
    }, []);

    const value = useMemo(() => ({
        onSave,
        initialDate,
        setNewAppointmentData,
        clearNewAppointmentData,
    }), [onSave, initialDate, setNewAppointmentData, clearNewAppointmentData]);

    return (
        <NewAppointmentContext.Provider value={value}>
            {children}
        </NewAppointmentContext.Provider>
    );
};

// --- EDIT APPOINTMENT CONTEXT ---
interface EditAppointmentContextType {
    appointment: Appointment | null;
    onSave: ((appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) | null;
    setEditAppointmentData: (appointment: Appointment, onSave: (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) => void;
    clearEditAppointmentData: () => void;
}

const EditAppointmentContext = createContext<EditAppointmentContextType | undefined>(undefined);

export const useEditAppointment = () => {
    const context = useContext(EditAppointmentContext);
    if (!context) throw new Error('useEditAppointment must be used within an EditAppointmentProvider');
    return context;
};

export const EditAppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [onSave, setOnSave] = useState<((appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) | null>(null);

    const setEditAppointmentData = useCallback((apt: Appointment, handler: (appointmentData: Omit<Appointment, 'id' | 'status' | 'created_at'>) => Promise<void>) => {
        setAppointment(apt);
        setOnSave(() => handler);
    }, []);

    const clearEditAppointmentData = useCallback(() => {
        setAppointment(null);
        setOnSave(null);
    }, []);

    const value = useMemo(() => ({
        appointment,
        onSave,
        setEditAppointmentData,
        clearEditAppointmentData,
    }), [appointment, onSave, setEditAppointmentData, clearEditAppointmentData]);

    return (
        <EditAppointmentContext.Provider value={value}>
            {children}
        </EditAppointmentContext.Provider>
    );
};

// --- APPOINTMENT DETAIL CONTEXT ---
interface AppointmentDetailContextType {
    appointment: Appointment | null;
    setAppointmentDetail: (appointment: Appointment) => void;
    clearAppointmentDetail: () => void;
}

const AppointmentDetailContext = createContext<AppointmentDetailContextType | undefined>(undefined);

export const useAppointmentDetail = () => {
    const context = useContext(AppointmentDetailContext);
    if (!context) throw new Error('useAppointmentDetail must be used within an AppointmentDetailProvider');
    return context;
};

export const AppointmentDetailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);

    const setAppointmentDetail = useCallback((apt: Appointment) => {
        setAppointment(apt);
    }, []);

    const clearAppointmentDetail = useCallback(() => {
        setAppointment(null);
    }, []);

    const value = useMemo(() => ({
        appointment,
        setAppointmentDetail,
        clearAppointmentDetail,
    }), [appointment, setAppointmentDetail, clearAppointmentDetail]);

    return (
        <AppointmentDetailContext.Provider value={value}>
            {children}
        </AppointmentDetailContext.Provider>
    );
};

// --- SYSTEM SETTINGS CONTEXT ---
interface SystemSettingsContextType {
    settings: SystemSettings;
    updateCreditSalesEnabled: (enabled: boolean) => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (!context) throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    return context;
};

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettings>({
        creditSalesEnabled: false, // Default
    });

    // Buscar configurações do Supabase
    const fetchSettings = useCallback(async () => {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .single();
        
        if (error) {
            // Se a tabela não existir ou não houver registro, usar padrões
            console.log('Settings not found, using defaults');
            return;
        }
        
        if (data) {
            setSettings({
                creditSalesEnabled: data.credit_sales_enabled || false,
            });
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateCreditSalesEnabled = useCallback(async (enabled: boolean) => {
        // Tentar atualizar ou criar registro
        const { error } = await supabase
            .from('system_settings')
            .upsert({ 
                id: 1, // Sempre usar ID 1 para configurações gerais
                credit_sales_enabled: enabled 
            }, {
                onConflict: 'id'
            });
        
        if (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
        
        setSettings(prev => ({ ...prev, creditSalesEnabled: enabled }));
    }, []);

    const value = useMemo(() => ({
        settings,
        updateCreditSalesEnabled,
    }), [settings, updateCreditSalesEnabled]);

    return (
        <SystemSettingsContext.Provider value={value}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

// --- CREDIT SALES CONTEXT ---
interface CreditSalesContextType {
    creditSales: CreditSale[];
    installments: Installment[];
    fetchCreditSales: () => Promise<void>;
    addCreditSale: (sale: Omit<CreditSale, 'id' | 'status' | 'totalPaid' | 'remainingAmount' | 'created_at'>, installments: Omit<Installment, 'id' | 'status' | 'created_at'>[]) => Promise<void>;
    payInstallment: (installmentId: number, paymentMethod: string, paidDate?: string) => Promise<void>;
    updateCreditSaleStatus: () => Promise<void>; // Atualiza status baseado nas parcelas
}

const CreditSalesContext = createContext<CreditSalesContextType | undefined>(undefined);

export const useCreditSales = () => {
    const context = useContext(CreditSalesContext);
    if (!context) throw new Error('useCreditSales must be used within a CreditSalesProvider');
    return context;
};

export const CreditSalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
    const [installments, setInstallments] = useState<Installment[]>([]);

    const fetchCreditSales = useCallback(async () => {
        // Buscar vendas no fiado
        const { data: salesData, error: salesError } = await supabase
            .from('credit_sales')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (salesError) {
            console.error('Error fetching credit sales:', salesError);
            return;
        }

        // Buscar parcelas
        const { data: installmentsData, error: installmentsError } = await supabase
            .from('installments')
            .select('*')
            .order('duedate', { ascending: true });
        
        if (installmentsError) {
            console.error('Error fetching installments:', installmentsError);
            return;
        }

        if (salesData) {
            const mappedSales = salesData.map(({ 
                id, 
                clientname, 
                client_id,
                products, 
                totalamount, 
                subtotal, 
                discount, 
                numberofinstallments, 
                firstduedate, 
                status, 
                totalpaid, 
                remainingamount, 
                date, 
                created_at 
            }) => ({
                id,
                clientName: clientname,
                clientId: client_id || undefined,
                products,
                totalAmount: totalamount || 0,
                subtotal: subtotal || 0,
                discount: discount || 0,
                numberOfInstallments: numberofinstallments || 1,
                firstDueDate: firstduedate,
                status,
                totalPaid: totalpaid || 0,
                remainingAmount: remainingamount || 0,
                date,
                created_at,
            })) as CreditSale[];
            setCreditSales(mappedSales);
        } else {
            setCreditSales([]);
        }

        if (installmentsData) {
            const mappedInstallments = installmentsData.map(({ 
                id, 
                creditsaleid, 
                installmentnumber, 
                amount, 
                duedate, 
                status, 
                paiddate, 
                paymentmethod, 
                created_at 
            }) => ({
                id,
                creditSaleId: creditsaleid,
                installmentNumber: installmentnumber || 1,
                amount: amount || 0,
                dueDate: duedate,
                status,
                paidDate: paiddate,
                paymentMethod: paymentmethod,
                created_at,
            })) as Installment[];
            setInstallments(mappedInstallments);
        } else {
            setInstallments([]);
        }
    }, []);

    useEffect(() => {
        fetchCreditSales();
        
        // Ouvir evento de atualização de cliente para recarregar credit sales
        const handleClientUpdated = () => {
            fetchCreditSales();
        };
        window.addEventListener('clientUpdated', handleClientUpdated);
        
        return () => {
            window.removeEventListener('clientUpdated', handleClientUpdated);
        };
    }, [fetchCreditSales]);

    const addCreditSale = useCallback(async (
        sale: Omit<CreditSale, 'id' | 'status' | 'totalPaid' | 'remainingAmount' | 'created_at'>,
        installmentsData: Omit<Installment, 'id' | 'status' | 'created_at'>[]
    ) => {
        // Calcular valores das parcelas
        const installmentAmount = sale.totalAmount / sale.numberOfInstallments;
        
        // Criar venda no fiado
        const creditSaleData: any = {
            clientname: sale.clientName,
            products: sale.products,
            totalamount: sale.totalAmount,
            subtotal: sale.subtotal,
            discount: sale.discount,
            numberofinstallments: sale.numberOfInstallments,
            firstduedate: sale.firstDueDate,
            status: CreditSaleStatus.Active,
            totalpaid: 0,
            remainingamount: sale.totalAmount,
            date: sale.date,
        };
        
        // Se o sale tem clientId, incluir na inserção
        if ('clientId' in sale && sale.clientId) {
            creditSaleData.client_id = sale.clientId;
        }
        
        const { data: saleData, error: saleError } = await supabase
            .from('credit_sales')
            .insert([creditSaleData])
            .select()
            .single();

        if (saleError) {
            console.error('Error adding credit sale:', saleError);
            throw saleError;
        }

        if (!saleData) {
            throw new Error('Failed to create credit sale');
        }

        // Criar parcelas
        const installmentsToInsert = installmentsData.map((inst, index) => {
            const dueDate = new Date(sale.firstDueDate);
            dueDate.setMonth(dueDate.getMonth() + index);
            return {
                creditsaleid: saleData.id,
                installmentnumber: index + 1,
                amount: inst.amount,
                duedate: dueDate.toISOString().split('T')[0],
                status: InstallmentStatus.Pending,
            };
        });

        const { error: installmentsError } = await supabase
            .from('installments')
            .insert(installmentsToInsert);

        if (installmentsError) {
            console.error('Error adding installments:', installmentsError);
            // Reverter criação da venda se der erro nas parcelas
            await supabase.from('credit_sales').delete().eq('id', saleData.id);
            throw installmentsError;
        }

        // Atualizar lista
        await fetchCreditSales();
    }, [fetchCreditSales]);

    const payInstallment = useCallback(async (installmentId: number, paymentMethod: string, paidDate?: string) => {
        const paymentDate = paidDate || new Date().toISOString().split('T')[0];

        const { data: installment, error: updateError } = await supabase
            .from('installments')
            .update({
                status: InstallmentStatus.Paid,
                paiddate: paymentDate,
                paymentmethod: paymentMethod,
            })
            .eq('id', installmentId)
            .select()
            .single();

        if (updateError) {
            console.error('Error paying installment:', updateError);
            throw updateError;
        }

        if (installment) {
            // Buscar dados da venda no fiado
            const creditSaleId = installment.creditsaleid;
            const { data: creditSale } = await supabase
                .from('credit_sales')
                .select('*')
                .eq('id', creditSaleId)
                .single();

            if (creditSale) {
                const newTotalPaid = (creditSale.totalpaid || 0) + installment.amount;
                const newRemaining = Math.max(0, (creditSale.remainingamount || 0) - installment.amount);
                
                // Verificar se está quitado (buscar novamente para incluir a que acabou de ser paga)
                const { data: allInstallments } = await supabase
                    .from('installments')
                    .select('status')
                    .eq('creditsaleid', creditSaleId);

                const allPaid = allInstallments?.every(inst => 
                    inst.status === InstallmentStatus.Paid
                );

                await supabase
                    .from('credit_sales')
                    .update({
                        totalpaid: newTotalPaid,
                        remainingamount: newRemaining,
                        status: allPaid ? CreditSaleStatus.Paid : CreditSaleStatus.Active,
                    })
                    .eq('id', creditSaleId);

                // NOVO: Criar transação no relatório para registrar o pagamento
                const transactionDescription = `Fiado - ${creditSale.clientname} - Parcela ${installment.installmentnumber}/${creditSale.numberofinstallments}`;
                
                await supabase
                    .from('transactions')
                    .insert([{
                        clientname: creditSale.clientname,
                        service: transactionDescription,
                        date: paymentDate,
                        paymentmethod: paymentMethod,
                        subtotal: installment.amount,
                        discount: 0,
                        value: installment.amount,
                        type: 'product', // Classificar como produto/venda
                    }]);
            }
        }

        await fetchCreditSales();
    }, [fetchCreditSales]);

    const updateCreditSaleStatus = useCallback(async () => {
        // Atualizar status das parcelas baseado na data de vencimento
        const today = new Date().toISOString().split('T')[0];
        
        // Marcar parcelas atrasadas
        await supabase
            .from('installments')
            .update({ status: InstallmentStatus.Overdue })
            .eq('status', InstallmentStatus.Pending)
            .lt('duedate', today);

        // Atualizar status das vendas
        const { data: sales } = await supabase
            .from('credit_sales')
            .select('id')
            .neq('status', CreditSaleStatus.Paid);

        if (sales) {
            for (const sale of sales) {
                const { data: saleInstallments } = await supabase
                    .from('installments')
                    .select('status')
                    .eq('creditsaleid', sale.id);

                if (saleInstallments) {
                    const hasOverdue = saleInstallments.some(inst => inst.status === InstallmentStatus.Overdue);
                    const allPaid = saleInstallments.every(inst => inst.status === InstallmentStatus.Paid);
                    
                    let newStatus = CreditSaleStatus.Active;
                    if (allPaid) {
                        newStatus = CreditSaleStatus.Paid;
                    } else if (hasOverdue) {
                        newStatus = CreditSaleStatus.Overdue;
                    }

                    await supabase
                        .from('credit_sales')
                        .update({ status: newStatus })
                        .eq('id', sale.id);
                }
            }
        }

        await fetchCreditSales();
    }, [fetchCreditSales]);

    const value = useMemo(() => ({
        creditSales,
        installments,
        fetchCreditSales,
        addCreditSale,
        payInstallment,
        updateCreditSaleStatus,
    }), [creditSales, installments, fetchCreditSales, addCreditSale, payInstallment, updateCreditSaleStatus]);

    return (
        <CreditSalesContext.Provider value={value}>
            {children}
        </CreditSalesContext.Provider>
    );
};

// --- CLIENTES ---
const ClientsContext = React.createContext<{
    clients: Client[];
    fetchClients: () => Promise<void>;
    addClient: (client: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
    updateClient: (id: number, client: Partial<Client>) => Promise<void>;
    deleteClient: (id: number) => Promise<void>;
    isLoading: boolean;
} | undefined>(undefined);

export const useClients = () => {
    const context = React.useContext(ClientsContext);
    if (!context) {
        throw new Error('useClients must be used within a ClientsProvider');
    }
    return context;
};

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('fullname', { ascending: true });

            if (error) throw error;

            // Mapear os dados do banco (snake_case) para o formato Client (camelCase)
            const mappedClients: Client[] = (data || []).map((item: any) => ({
                id: item.id,
                fullName: item.fullname,
                whatsapp: item.whatsapp,
                nickname: item.nickname || undefined,
                observation: item.observation || undefined,
                cpf: item.cpf || undefined,
                created_at: item.created_at,
            }));

            setClients(mappedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Função para capitalizar palavras maiores que 3 letras
    const capitalizeWords = useCallback((text: string): string => {
        if (!text) return text;
        
        return text
            .toLowerCase()
            .split(' ')
            .map(word => {
                // Se a palavra tem mais de 3 letras, capitaliza a primeira letra
                if (word.length > 3) {
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }
                // Se tem 3 ou menos letras, mantém minúscula
                return word;
            })
            .join(' ');
    }, []);

    // Função para formatar WhatsApp: (87) 99155-6444
    const formatWhatsApp = useCallback((whatsapp: string): string => {
        if (!whatsapp) return whatsapp;
        
        // Remove todos os caracteres não numéricos
        const numbers = whatsapp.replace(/\D/g, '');
        
        // Se tiver 10 ou 11 dígitos (com ou sem 9 inicial)
        if (numbers.length === 10) {
            // Formato: (DDD) XXXX-XXXX
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else if (numbers.length === 11) {
            // Formato: (DDD) 9XXXX-XXXX
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        }
        
        // Se não tiver o tamanho correto, retorna sem formatação (será validado em outro lugar)
        return whatsapp;
    }, []);

    // Função para formatar CPF: 116.438.494-50
    const formatCPF = useCallback((cpf: string): string => {
        if (!cpf) return cpf;
        
        // Remove todos os caracteres não numéricos
        const numbers = cpf.replace(/\D/g, '');
        
        // Se tiver 11 dígitos, formata: XXX.XXX.XXX-XX
        if (numbers.length === 11) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
        }
        
        // Se não tiver 11 dígitos, retorna sem formatação (será validado em outro lugar)
        return cpf;
    }, []);

    const addClient = useCallback(async (client: Omit<Client, 'id' | 'created_at'>): Promise<Client> => {
        try {
            // Capitalizar campos de texto antes de salvar
            const capitalizedClient = {
                fullName: capitalizeWords(client.fullName),
                whatsapp: formatWhatsApp(client.whatsapp), // Formatar WhatsApp
                nickname: client.nickname ? capitalizeWords(client.nickname) : null,
                observation: client.observation ? capitalizeWords(client.observation) : null,
                cpf: client.cpf ? formatCPF(client.cpf) : null, // Formatar CPF
            };

            const { data, error } = await supabase
                .from('clients')
                .insert([{
                    fullname: capitalizedClient.fullName,
                    whatsapp: capitalizedClient.whatsapp,
                    nickname: capitalizedClient.nickname,
                    observation: capitalizedClient.observation,
                    cpf: capitalizedClient.cpf,
                }])
                .select()
                .single();

            if (error) {
                console.error('Error adding client:', error);
                throw error;
            }

            // Mapear os dados retornados para o formato Client
            const newClient: Client = {
                id: data.id,
                fullName: data.fullname,
                whatsapp: data.whatsapp,
                nickname: data.nickname || undefined,
                observation: data.observation || undefined,
                cpf: data.cpf || undefined,
                created_at: data.created_at,
            };

            // Atualizar a lista de clientes
            setClients(prev => [...prev, newClient]);
            
            // Retornar o cliente criado
            return newClient;
        } catch (error) {
            console.error('Error adding client:', error);
            throw error;
        }
    }, [capitalizeWords, formatWhatsApp, formatCPF]);

    const updateClient = useCallback(async (id: number, client: Partial<Client>) => {
        try {
            // Buscar o cliente antigo antes de atualizar para poder atualizar referências
            const oldClient = clients.find(c => c.id === id);
            if (!oldClient) {
                throw new Error('Cliente não encontrado');
            }

            const updateData: any = {};
            // Capitalizar campos de texto antes de atualizar
            if (client.fullName !== undefined) updateData.fullname = capitalizeWords(client.fullName);
            if (client.whatsapp !== undefined) updateData.whatsapp = formatWhatsApp(client.whatsapp); // Formatar WhatsApp
            if (client.nickname !== undefined) updateData.nickname = client.nickname ? capitalizeWords(client.nickname) : null;
            if (client.observation !== undefined) updateData.observation = client.observation ? capitalizeWords(client.observation) : null;
            if (client.cpf !== undefined) updateData.cpf = client.cpf ? formatCPF(client.cpf) : null; // Formatar CPF

            const { data, error } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Mapear os dados retornados para o formato Client
            const updatedClient: Client = {
                id: data.id,
                fullName: data.fullname,
                whatsapp: data.whatsapp,
                nickname: data.nickname || undefined,
                observation: data.observation || undefined,
                cpf: data.cpf || undefined,
                created_at: data.created_at,
            };

            setClients(prev => prev.map(c => c.id === id ? updatedClient : c));

            // Se o nome ou WhatsApp foi alterado, atualizar todas as transações e agendamentos relacionados
            if (client.fullName !== undefined || client.whatsapp !== undefined) {
                const oldName = oldClient.fullName;
                const newName = client.fullName !== undefined ? capitalizeWords(client.fullName) : oldName;
                const newWhatsapp = client.whatsapp !== undefined ? formatWhatsApp(client.whatsapp) : oldClient.whatsapp;
                const newNameWithWhatsapp = `${newName}|${newWhatsapp}`;

                // ATUALIZAR USANDO client_id - muito mais preciso e seguro
                // Só atualizar registros que têm client_id correspondente ao ID do cliente sendo editado
                
                // 1. Atualizar transações vinculadas ao cliente
                const { data: transactionsData } = await supabase
                    .from('transactions')
                    .select('id, clientname')
                    .eq('client_id', id);
                
                if (transactionsData && transactionsData.length > 0) {
                    for (const transaction of transactionsData) {
                        let newClientName = newName;
                        // Se tinha WhatsApp no formato antigo, manter no formato novo
                        if (transaction.clientname.includes('|')) {
                            newClientName = newNameWithWhatsapp;
                        }
                        
                        await supabase
                            .from('transactions')
                            .update({ clientname: newClientName })
                            .eq('id', transaction.id);
                    }
                }

                // 2. Atualizar agendamentos vinculados ao cliente
                const { data: appointmentsData } = await supabase
                    .from('appointments')
                    .select('id, clientname')
                    .eq('client_id', id);
                
                if (appointmentsData && appointmentsData.length > 0) {
                    for (const appointment of appointmentsData) {
                        let newClientName = newName;
                        // Se tinha WhatsApp no formato antigo, manter no formato novo
                        if (appointment.clientname.includes('|')) {
                            newClientName = newNameWithWhatsapp;
                        }
                        
                        await supabase
                            .from('appointments')
                            .update({ clientname: newClientName })
                            .eq('id', appointment.id);
                    }
                }

                // 3. Atualizar vendas no fiado vinculadas ao cliente
                const { data: creditSalesData } = await supabase
                    .from('credit_sales')
                    .select('id, clientname')
                    .eq('client_id', id);
                
                if (creditSalesData && creditSalesData.length > 0) {
                    for (const creditSale of creditSalesData) {
                        let newClientName = newName;
                        // Se tinha WhatsApp no formato antigo, manter no formato novo
                        if (creditSale.clientname.includes('|')) {
                            newClientName = newNameWithWhatsapp;
                        }
                        
                        await supabase
                            .from('credit_sales')
                            .update({ clientname: newClientName })
                            .eq('id', creditSale.id);
                    }
                }

                // Aguardar um pouco para garantir que todas as atualizações foram processadas
                // e então disparar evento customizado para recarregar transações, agendamentos e credit sales
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('clientUpdated'));
                }, 500);
            }
        } catch (error) {
            console.error('Error updating client:', error);
            throw error;
        }
    }, [capitalizeWords, formatWhatsApp, formatCPF, clients]);

    const deleteClient = useCallback(async (id: number) => {
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting client:', error);
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    return (
        <ClientsContext.Provider value={{
            clients,
            fetchClients,
            addClient,
            updateClient,
            deleteClient,
            isLoading,
        }}>
            {children}
        </ClientsContext.Provider>
    );
};

// --- DESPESAS ---
const ExpensesContext = React.createContext<{
    expenses: Expense[];
    fetchExpenses: () => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
    updateExpense: (id: number, expense: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: number) => Promise<void>;
} | undefined>(undefined);

export const useExpenses = () => {
    const context = React.useContext(ExpensesContext);
    if (!context) {
        throw new Error('useExpenses must be used within an ExpensesProvider');
    }
    return context;
};

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const fetchExpenses = useCallback(async () => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching expenses:', error);
            return;
        }

        if (data) {
            const mappedExpenses: Expense[] = data.map((item: any) => ({
                id: item.id,
                description: item.description,
                amount: item.amount,
                date: item.date,
                category: item.category || undefined,
                created_at: item.created_at,
            }));
            setExpenses(mappedExpenses);
        } else {
            setExpenses([]);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('expenses')
            .insert([{
                description: expense.description,
                amount: expense.amount,
                date: expense.date,
                category: expense.category || null,
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding expense:', error);
            throw error;
        }

        if (data) {
            const newExpense: Expense = {
                id: data.id,
                description: data.description,
                amount: data.amount,
                date: data.date,
                category: data.category || undefined,
                created_at: data.created_at,
            };
            setExpenses(prev => [newExpense, ...prev]);
        }
    }, []);

    const updateExpense = useCallback(async (id: number, expense: Partial<Expense>) => {
        const updateData: any = {};
        if (expense.description !== undefined) updateData.description = expense.description;
        if (expense.amount !== undefined) updateData.amount = expense.amount;
        if (expense.date !== undefined) updateData.date = expense.date;
        if (expense.category !== undefined) updateData.category = expense.category || null;

        const { data, error } = await supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating expense:', error);
            throw error;
        }

        if (data) {
            const updatedExpense: Expense = {
                id: data.id,
                description: data.description,
                amount: data.amount,
                date: data.date,
                category: data.category || undefined,
                created_at: data.created_at,
            };
            setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
        }
    }, []);

    const deleteExpense = useCallback(async (id: number) => {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }

        setExpenses(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <ExpensesContext.Provider value={{
            expenses,
            fetchExpenses,
            addExpense,
            updateExpense,
            deleteExpense,
        }}>
            {children}
        </ExpensesContext.Provider>
    );
};

// --- CATEGORIAS DE DESPESAS ---
const ExpenseCategoriesContext = React.createContext<{
    categories: ExpenseCategory[];
    fetchCategories: () => Promise<void>;
    addCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at'>) => Promise<void>;
    updateCategory: (id: number, category: Partial<ExpenseCategory>) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
} | undefined>(undefined);

export const useExpenseCategories = () => {
    const context = React.useContext(ExpenseCategoriesContext);
    if (!context) {
        throw new Error('useExpenseCategories must be used within an ExpenseCategoriesProvider');
    }
    return context;
};

export const ExpenseCategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from('expense_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching expense categories:', error);
            return;
        }

        if (data) {
            const mappedCategories: ExpenseCategory[] = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                color: item.color || '#6b7280',
                created_at: item.created_at,
            }));
            setCategories(mappedCategories);
        } else {
            setCategories([]);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = useCallback(async (category: Omit<ExpenseCategory, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('expense_categories')
            .insert([{
                name: category.name,
                color: category.color || '#6b7280',
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding expense category:', error);
            throw error;
        }

        if (data) {
            const newCategory: ExpenseCategory = {
                id: data.id,
                name: data.name,
                color: data.color || '#6b7280',
                created_at: data.created_at,
            };
            setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, []);

    const updateCategory = useCallback(async (id: number, category: Partial<ExpenseCategory>) => {
        const updateData: any = {};
        if (category.name !== undefined) updateData.name = category.name;
        if (category.color !== undefined) updateData.color = category.color;

        const { data, error } = await supabase
            .from('expense_categories')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating expense category:', error);
            throw error;
        }

        if (data) {
            const updatedCategory: ExpenseCategory = {
                id: data.id,
                name: data.name,
                color: data.color || '#6b7280',
                created_at: data.created_at,
            };
            setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c).sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, []);

    const deleteCategory = useCallback(async (id: number) => {
        const { error } = await supabase
            .from('expense_categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting expense category:', error);
            throw error;
        }

        setCategories(prev => prev.filter(c => c.id !== id));
    }, []);

    return (
        <ExpenseCategoriesContext.Provider value={{
            categories,
            fetchCategories,
            addCategory,
            updateCategory,
            deleteCategory,
        }}>
            {children}
        </ExpenseCategoriesContext.Provider>
    );
};
