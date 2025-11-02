import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useSystemSettings } from '../contexts.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined">{name}</span>;

export const SettingsMainPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { settings, updateCreditSalesEnabled } = useSystemSettings();
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-text-light-primary dark:text-text-dark-primary text-4xl font-black leading-tight tracking-[-0.033em]">Configurações</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-normal leading-normal mt-2">
          Gerencie as informações e preferências da sua barbearia.
        </p>
      </header>

      <div className="space-y-4">
        {/* Gestão de Serviços */}
        <button
          onClick={() => navigate('/settings/services')}
          className="w-full bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark p-6 hover:shadow-xl transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                <Icon name="content_cut" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Gestão de Serviços
                </h2>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  Cadastre e gerencie os serviços oferecidos pela barbearia
                </p>
              </div>
            </div>
            <Icon name="chevron_right" />
          </div>
        </button>

        {/* Gestão de Produtos */}
        <button
          onClick={() => navigate('/settings/products')}
          className="w-full bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark p-6 hover:shadow-xl transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                <Icon name="shopping_cart" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Gestão de Produtos
                </h2>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  Cadastre e gerencie os produtos vendidos pela barbearia
                </p>
              </div>
            </div>
            <Icon name="chevron_right" />
          </div>
        </button>

        {/* Configurações do Sistema */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
          <div className="p-6 border-b border-slate-200 dark:border-border-dark">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Configurações do Sistema
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Vendas no Fiado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20">
                  <Icon name="credit_card" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                    Vendas no Fiado
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    Ative ou desative a funcionalidade de vendas parceladas no fiado
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (isUpdating) return;
                  try {
                    setIsUpdating(true);
                    await updateCreditSalesEnabled(!settings.creditSalesEnabled);
                  } catch (error: any) {
                    alert(`Erro ao atualizar configuração: ${error.message || 'Erro desconhecido'}`);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className={`relative flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                  settings.creditSalesEnabled
                    ? 'bg-primary'
                    : 'bg-gray-300 dark:bg-gray-600'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                    settings.creditSalesEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Aparência */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
          <div className="p-6 border-b border-slate-200 dark:border-border-dark">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Aparência
            </h2>
          </div>
          <div className="p-6 flex flex-wrap items-center gap-4">
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">Tema do Sistema</p>
            <div className="flex h-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-[#181211] p-1">
              <button 
                onClick={() => setTheme('light')}
                className={`flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors ${
                  theme === 'light' 
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Claro
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex h-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors ${
                  theme === 'dark' 
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Escuro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

