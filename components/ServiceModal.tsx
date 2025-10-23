import React, { useState, useEffect } from 'react';
import { useServices } from '../contexts.tsx';
import { Service } from '../types.ts';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
}

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined !text-2xl">{name}</span>;

export const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service }) => {
  const { addService, updateService } = useServices();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name);
      setPrice(service.price.toString());
    } else {
      setName('');
      setPrice('');
    }
  }, [service]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
        window.addEventListener('keydown', handleEsc);
    }
    return () => {
        window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNumber = parseFloat(price.replace(',', '.'));
    if (!name || isNaN(priceNumber) || priceNumber < 0) {
        alert("Por favor, preencha o nome e um preço válido.");
        return;
    }
    
    try {
        if (service) { // Editing existing service
          await updateService({ ...service, name, price: priceNumber });
        } else { // Adding new service
          await addService({ name, price: priceNumber });
        }
        onClose();
    } catch (error: any) {
        console.error("Failed to save service:", error);
        alert(`Falha ao salvar serviço: ${error.message || 'Erro desconhecido.'}`);
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-background-light dark:bg-background-dark shadow-2xl"
        onClick={handleModalContentClick}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {service ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
          </p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 p-5">
            <label className="flex flex-col">
              <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Nome do Serviço</p>
              <input
                required
                autoFocus
                className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                placeholder="Ex: Corte Masculino"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <p className="pb-2 text-base font-medium text-gray-800 dark:text-gray-100">Preço (R$)</p>
              <input
                required
                type="text"
                className="form-input h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-50 p-3 text-base font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary"
                placeholder="Ex: 45,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-5 sm:flex-row sm:justify-end dark:border-white/10">
            <button type="button" onClick={onClose} className="flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-background-dark">
              Cancelar
            </button>
            <button type="submit" className="flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark">
              Salvar Serviço
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
