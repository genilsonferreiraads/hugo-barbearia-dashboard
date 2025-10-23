import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  ServicesProvider, 
  AppointmentsProvider, 
  TransactionsProvider 
} from './contexts.tsx';
import { Layout } from './components/Layout.tsx';
import { LoginPage } from './components/Login.tsx';
import { DashboardPage } from './components/Dashboard.tsx';
import { SchedulePage } from './components/Schedule.tsx';
import { ServiceRegistryPage } from './components/ServiceRegistry.tsx';
import { ReportsPage } from './components/Reports.tsx';
import { SettingsPage } from './components/Settings.tsx';

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ServicesProvider>
        <AppointmentsProvider>
          <TransactionsProvider>
            <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="register-service" element={<ServiceRegistryPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Placeholder routes for other nav items */}
                <Route path="clients" element={<PlaceholderPage title="Clientes" />} />
                <Route path="financial" element={<PlaceholderPage title="Financeiro" />} />
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </HashRouter>
          </TransactionsProvider>
        </AppointmentsProvider>
      </ServicesProvider>
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
