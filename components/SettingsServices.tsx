import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../contexts.tsx';
import { Service } from '../types.ts';
import { ServiceModal } from './ServiceModal.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined">{name}</span>;

export const SettingsServicesPage: React.FC = () => {
  const { services, deleteService } = useServices();
  const navigate = useNavigate();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const handleOpenServiceModal = (service: Service | null = null) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleCloseServiceModal = () => {
    setIsServiceModalOpen(false);
    setServiceToEdit(null);
  };

  const handleDeleteService = async (serviceId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await deleteService(serviceId);
      } catch (error: any) {
        console.error("Failed to delete service:", error);
        alert(`Falha ao excluir serviço: ${error.message || 'Erro desconhecido.'}`);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header with Back Button */}
      <header className="mb-8">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors mb-4"
        >
          <Icon name="arrow_back" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-light-primary dark:text-text-dark-primary text-4xl font-black leading-tight tracking-[-0.033em]">Gestão de Serviços</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-base font-normal leading-normal mt-2">
              Cadastre e gerencie os serviços oferecidos pela sua barbearia.
            </p>
          </div>
          <button
            onClick={() => handleOpenServiceModal()}
            className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="add" />
            <span>Adicionar Serviço</span>
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-card-dark rounded-xl shadow-lg border border-slate-200 dark:border-border-dark">
        <div className="p-6 space-y-4">
          {services.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-border-dark">
              {services.map(service => (
                <li key={service.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{service.name}</p>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenServiceModal(service)}
                      className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label={`Editar ${service.name}`}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label={`Excluir ${service.name}`}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-text-light-secondary dark:text-text-dark-secondary py-8">
              Nenhum serviço cadastrado. Adicione um para começar.
            </p>
          )}
        </div>
      </div>

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={handleCloseServiceModal}
        service={serviceToEdit}
      />
    </div>
  );
};

