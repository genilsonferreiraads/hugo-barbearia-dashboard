import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  AuthProvider,
  ServicesProvider, 
  ProductsProvider,
  AppointmentsProvider, 
  TransactionsProvider,
  FinalizeAppointmentProvider,
  NewAppointmentProvider,
  EditAppointmentProvider,
  AppointmentDetailProvider,
  useFinalizeAppointment,
  useNewAppointment,
  useEditAppointment,
  useAppointmentDetail,
  useEditTransaction,
  EditTransactionProvider
} from './contexts.tsx';
import { Layout } from './components/Layout.tsx';
import { PageTransitionWrapper } from './components/PageTransitionWrapper.tsx';
import { LoginPage } from './components/Login.tsx';
import { DashboardPage } from './components/Dashboard.tsx';
import { SchedulePage } from './components/Schedule.tsx';
import { ServiceRegistryPage } from './components/ServiceRegistry.tsx';
import { ReportsPage } from './components/Reports.tsx';
import { SettingsMainPage } from './components/SettingsMain.tsx';
import { SettingsServicesPage } from './components/SettingsServices.tsx';
import { SettingsProductsPage } from './components/SettingsProducts.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { FinalizeAppointmentPage } from './components/FinalizeAppointmentPage.tsx';
import { NewAppointmentPage } from './components/NewAppointmentPage.tsx';
import { EditAppointmentPage } from './components/EditAppointmentPage.tsx';
import { AppointmentDetailPage } from './components/AppointmentDetailPage.tsx';
import { FinalizedServicesPage } from './components/FinalizedServices.tsx';
import { TransactionDetailPage } from './components/TransactionDetailPage.tsx';
import { AppointmentReceiptPage } from './components/AppointmentReceiptPage.tsx';
import { SalesPage } from './components/Sales.tsx';
import { SalesListPage } from './components/SalesList.tsx';
import { Appointment } from './types.ts';

// Wrapper for new appointment page
const NewAppointmentWrapper: React.FC = () => {
  const { onSave, initialDate } = useNewAppointment();
  
  if (!onSave) {
    return <Navigate to="/" replace />;
  }

  return (
    <NewAppointmentPage 
      onSave={onSave}
      initialDate={initialDate}
    />
  );
};

// Wrapper component to handle finalize appointment page with state
const FinalizeAppointmentWrapper: React.FC = () => {
  const { appointment, onFinalize, redirectTo } = useFinalizeAppointment();
  const navigate = useNavigate();
  
  // onFinalize is always a function now (wrapper), but we need appointment
  if (!appointment) {
    return <Navigate to="/" replace />;
  }

  return (
    <FinalizeAppointmentPage 
      appointment={appointment}
      onFinalize={onFinalize}
      redirectTo={redirectTo || undefined}
    />
  );
};

// Wrapper for edit appointment page
const EditAppointmentWrapper: React.FC = () => {
  const { appointment, onSave } = useEditAppointment();
  
  if (!appointment || !onSave) {
    return <Navigate to="/" replace />;
  }

  return (
    <EditAppointmentPage 
      initialAppointment={appointment}
      onSave={onSave}
    />
  );
};

// Wrapper for appointment detail page
const AppointmentDetailWrapper: React.FC = () => {
  const { appointment } = useAppointmentDetail();
  
  if (!appointment) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppointmentDetailPage 
      appointment={appointment}
    />
  );
};

// Wrapper for edit transaction page
const EditTransactionWrapper: React.FC = () => {
  const { transaction, onSave } = useEditTransaction();
  const navigate = useNavigate();
  
  if (!transaction || !onSave) {
    return <Navigate to="/" replace />;
  }

  // Convert transaction to appointment-like object for the FinalizeAppointmentPage
  const pseudoAppointment: Appointment = {
    id: 0,
    clientName: transaction.clientName,
    service: transaction.service,
    date: transaction.date,
    time: '00:00:00',
    status: 'Confirmed' as any,
    created_at: '',
  };

  return (
    <FinalizeAppointmentPage 
      appointment={pseudoAppointment}
      onFinalize={onSave}
      isEditing={true}
      initialData={transaction}
      redirectTo="/register-service"
    />
  );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ServicesProvider>
          <ProductsProvider>
          <AppointmentsProvider>
            <TransactionsProvider>
              <FinalizeAppointmentProvider>
                <NewAppointmentProvider>
                  <EditAppointmentProvider>
                    <EditTransactionProvider>
                      <AppointmentDetailProvider>
                        <HashRouter>
                          <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/" element={
                              <ProtectedRoute>
                                <PageTransitionWrapper />
                              </ProtectedRoute>
                            }>
                              <Route index element={<Navigate to="/dashboard" replace />} />
                              <Route path="dashboard" element={<DashboardPage />} />
                              <Route path="schedule" element={<SchedulePage />} />
                              <Route path="register-service" element={<FinalizedServicesPage />} />
                              <Route path="register-service/new" element={<ServiceRegistryPage />} />
                              <Route path="reports" element={<ReportsPage />} />
                              <Route path="settings" element={<SettingsMainPage />} />
                              <Route path="settings/services" element={<SettingsServicesPage />} />
                              <Route path="settings/products" element={<SettingsProductsPage />} />
                              <Route path="sales" element={<SalesListPage />} />
                              <Route path="sales/new" element={<SalesPage />} />
                              <Route path="sales/edit" element={
                                <ProtectedRoute>
                                  <SalesPage />
                                </ProtectedRoute>
                              } />
                              <Route path="finalized-services" element={<FinalizedServicesPage />} />
                              <Route path="appointment-receipt" element={<AppointmentReceiptPage />} />
                              <Route path="finalize-appointment" element={
                                <ProtectedRoute>
                                  <FinalizeAppointmentWrapper />
                                </ProtectedRoute>
                              } />
                              <Route path="new-appointment" element={
                                <ProtectedRoute>
                                  <NewAppointmentWrapper />
                                </ProtectedRoute>
                              } />
                              <Route path="edit-appointment" element={
                                <ProtectedRoute>
                                  <EditAppointmentWrapper />
                                </ProtectedRoute>
                              } />
                              <Route path="appointment/:id" element={
                                <ProtectedRoute>
                                  <AppointmentDetailWrapper />
                                </ProtectedRoute>
                              } />
                              <Route path="edit-transaction" element={
                                <ProtectedRoute>
                                  <EditTransactionWrapper />
                                </ProtectedRoute>
                              } />
                              <Route path="transaction/:id" element={
                                <ProtectedRoute>
                                  <TransactionDetailPage />
                                </ProtectedRoute>
                              } />
                              {/* Placeholder routes for other nav items */}
                              <Route path="clients" element={<PlaceholderPage title="Clientes" />} />
                              <Route path="financial" element={<PlaceholderPage title="Financeiro" />} />
                              <Route path="finalized-services" element={<FinalizedServicesPage />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" />} />
                          </Routes>
                        </HashRouter>
                      </AppointmentDetailProvider>
                    </EditTransactionProvider>
                  </EditAppointmentProvider>
                </NewAppointmentProvider>
              </FinalizeAppointmentProvider>
            </TransactionsProvider>
          </AppointmentsProvider>
          </ProductsProvider>
        </ServicesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Placeholder component for routes that are not fully implemented
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <h1 className="text-4xl font-bold text-zinc-800 dark:text-white">{title}</h1>
    <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Esta página está em construção.</p>
    <span className="material-symbols-outlined text-9xl mt-8 text-primary/50">construction</span>
  </div>
);

export default App;
