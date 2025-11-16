import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../contexts.tsx';
import { Service } from '../types.ts';
import { ServiceModal } from './ServiceModal.tsx';

const Icon = ({ name, className }: { name: string; className?: string }) => 
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const SettingsServicesPage: React.FC = () => {
  const { services, deleteService } = useServices();
  const navigate = useNavigate();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const handleOpenServiceModal = (service: Service | null = null) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleCloseServiceModal = () => {
    setIsServiceModalOpen(false);
    setServiceToEdit(null);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteService(serviceToDelete.id);
      setServiceToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete service:", error);
      alert(`Falha ao excluir serviço: ${error.message || 'Erro desconhecido.'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-slide-in-up {
          animation: slideInUp 0.4s ease-out;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm font-medium"
            >
              <Icon name="arrow_back" className="text-lg" />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            <button
              onClick={() => handleOpenServiceModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-semibold py-2 px-4 rounded-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icon name="add" className="text-lg" />
              <span className="hidden sm:inline">Novo Serviço</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Gestão de Serviços
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cadastre e gerencie os serviços oferecidos pela sua barbearia
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {services.length === 0 ? (
          // Empty State
          <div className="animate-slide-in-up bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center">
              <Icon name="content_cut" className="text-4xl text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Nenhum serviço cadastrado
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Adicione seu primeiro serviço para começar
            </p>
            <button
              onClick={() => handleOpenServiceModal()}
              className="inline-flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              <Icon name="add" className="text-lg" />
              <span>Adicionar Primeiro Serviço</span>
            </button>
          </div>
        ) : (
          // Services Grid
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="animate-slide-in-up group bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 rounded-full blur-2xl"></div>
                
                <div className="relative">
                  {/* Icon & Title */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg">
                        <Icon name="content_cut" className="text-primary text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                          {service.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-2xl font-black text-primary">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Valor por atendimento</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenServiceModal(service)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm transition-all"
                    >
                      <Icon name="edit" className="text-base" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(service)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium text-sm transition-all"
                    >
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service Count */}
        {services.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total de <span className="font-bold text-primary">{services.length}</span> {services.length === 1 ? 'serviço' : 'serviços'} cadastrados
            </p>
          </div>
        )}
      </main>

      {/* Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={handleCloseServiceModal}
        service={serviceToEdit}
      />

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-slide-in-up border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl flex-shrink-0">
                <Icon name="warning" className="text-red-600 dark:text-red-400 text-3xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Confirmar Exclusão
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Tem certeza que deseja excluir o serviço:
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {serviceToDelete.name}?
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
