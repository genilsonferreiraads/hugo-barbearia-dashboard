import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts.tsx';

const navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/schedule', icon: 'calendar_today', label: 'Agenda' },
    { path: '/register-service', icon: 'content_cut', label: 'Atendimentos' },
    { path: '/reports', icon: 'bar_chart', label: 'Relatórios'},
    { path: '/clients', icon: 'group', label: 'Clientes' },
    { path: '/financial', icon: 'payments', label: 'Financeiro' },
];

const Icon = ({ name, filled = false }: { name: string; filled?: boolean }) => (
    <span className="material-symbols-outlined" style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}>
        {name}
    </span>
);

export const Layout: React.FC = () => {
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="relative flex min-h-screen w-full flex-row">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            
            {/* Mobile Menu Button - Minimalist Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center justify-center w-10 h-10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">{isSidebarOpen ? 'close' : 'notes'}</span>
                    </button>
                    <div className="flex items-center">
                        <span className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Hugo Barbearia</span>
                    </div>
                </div>
            </div>

            <aside className={`flex h-screen min-h-full flex-col bg-[#181211] p-4 w-64 fixed lg:sticky top-0 z-50 transition-transform duration-300 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 lg:relative lg:z-auto`}>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url("https://picsum.photos/id/1060/100/100")` }}></div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-base font-medium leading-normal">Hugo Barbearia</h1>
                            <p className="text-[#b9a29d] text-sm font-normal leading-normal">
                                {user?.email || 'Painel de Controle'}
                            </p>
                        </div>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={closeSidebar}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    isActive
                                        ? 'bg-[#392c28] text-white'
                                        : 'text-white/70 hover:bg-[#392c28] hover:text-white'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon name={item.icon} filled={isActive} />
                                        <p className="text-sm font-medium leading-normal">{item.label}</p>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                    <NavLink
                        to="/settings"
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isActive
                                ? 'bg-[#392c28] text-white'
                                : 'text-white/70 hover:bg-[#392c28] hover:text-white'
                            }`
                        }
                    >
                         {({ isActive }) => (
                            <>
                                <Icon name="settings" filled={isActive} />
                                <p className="text-sm font-medium leading-normal">Configurações</p>
                            </>
                         )}
                    </NavLink>
                    <button 
                        onClick={() => {
                            closeSidebar();
                            handleLogout();
                        }} 
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-[#392c28] hover:text-white transition-colors"
                    >
                        <Icon name="logout" />
                        <p className="text-sm font-medium leading-normal">Sair</p>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-4 lg:p-6 xl:p-10 overflow-y-auto w-full lg:w-auto main-content pt-20 lg:pt-4">
                <Outlet />
            </main>
        </div>
    );
};
