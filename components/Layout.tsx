import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

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

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="relative flex min-h-screen w-full flex-row">
            <aside className="flex h-screen min-h-full flex-col bg-[#181211] p-4 w-64 sticky top-0">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url("https://picsum.photos/id/1060/100/100")` }}></div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-base font-medium leading-normal">Hugo Barbearia</h1>
                            <p className="text-[#b9a29d] text-sm font-normal leading-normal">Painel de Controle</p>
                        </div>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
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
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-[#392c28] hover:text-white transition-colors">
                        <Icon name="logout" />
                        <p className="text-sm font-medium leading-normal">Sair</p>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};
