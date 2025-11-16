import React, { useState, useEffect } from 'react';
import { useClients } from '../contexts.tsx';
import { Client } from '../types.ts';
import { ClientSearchSelector } from './ClientSearchSelector.tsx';
import { SaveClientModal } from './SaveClientModal.tsx';

interface ClientSearchFieldProps {
    onSelectClient: (client: Client | null) => void;
    value?: string; // Nome do cliente atual
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onSaveNewClient?: (clientName: string) => Promise<void>; // Callback para salvar novo cliente
    showAddButton?: boolean; // Mostrar botão "Adicionar na base" abaixo do campo
    onValueChange?: (value: string) => void; // Callback para mudança de valor
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({
    onSelectClient,
    onValueChange: onValueChangeProp,
    value = '',
    placeholder = 'Digite o nome do cliente',
    className = '',
    disabled = false,
    onSaveNewClient,
    showAddButton = false
}) => {
    const { clients } = useClients();
    const [clientName, setClientName] = useState(value);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Sincronizar com value externo quando mudar
    useEffect(() => {
        if (value !== undefined && value !== clientName) {
            setClientName(value);
            // Tentar encontrar cliente pelo nome
            if (value && clients && clients.length > 0) {
                const found = clients.find(c => 
                    c.fullName.toLowerCase() === value.toLowerCase()
                );
                setSelectedClient(found || null);
            } else {
                setSelectedClient(null);
            }
        }
    }, [value, clients, clientName]);

    const handleClientSelect = (client: Client | null) => {
        setSelectedClient(client);
        if (client) {
            setClientName(client.fullName);
            onSelectClient(client);
        } else {
            // Quando deseleciona, não limpar o nome - permitir que o usuário continue digitando
            // Não chamar onSelectClient(null) aqui para não limpar o nome no componente pai
            // O nome será mantido no campo para permitir continuar sem salvar
        }
    };

    // Handler para quando o valor do ClientSearchSelector muda
    const handleValueChange = (name: string) => {
        setClientName(name);
        // Limpar seleção quando o nome muda completamente
        if (!name.trim()) {
            setSelectedClient(null);
            onSelectClient(null);
        } else {
            // Se está digitando um nome, verificar se existe na base
            const found = clients.find(c => 
                c.fullName.toLowerCase() === name.toLowerCase()
            );
            if (!found) {
                // Nome não existe na base - limpar seleção mas NÃO chamar onSelectClient(null)
                // Isso mantém o nome digitado e permite continuar sem salvar
                setSelectedClient(null);
                // NÃO chamar onSelectClient(null) aqui para não limpar o nome no componente pai
            }
        }
        
        // Sempre notificar o componente pai sobre a mudança do nome
        if (onValueChangeProp) {
            onValueChangeProp(name);
        }
    };


    const handleSaveClientSuccess = (client: Client) => {
        // Selecionar o cliente recém-criado
        setSelectedClient(client);
        setClientName(client.fullName);
        onSelectClient(client);
        
        // Chamar callback se fornecido
        if (onSaveNewClient) {
            onSaveNewClient(client.fullName);
        }
    };

    return (
        <div className={className}>
            {/* Busca sempre ativa - sem botão de lupa */}
            <ClientSearchSelector
                onSelectClient={handleClientSelect}
                value={clientName}
                placeholder={placeholder || 'Buscar cliente ou digite o nome...'}
                className="w-full"
                disabled={disabled}
                onValueChange={handleValueChange}
                onNewClient={showAddButton ? undefined : (clientNameValue) => {
                    // Quando clicar em "Novo Cliente", atualizar o nome e abrir modal
                    // Só funciona se showAddButton for false (modo antigo)
                    setClientName(clientNameValue);
                    setShowSaveModal(true);
                }}
            />
            
            {/* Mostrar informações do cliente selecionado apenas quando o modal NÃO estiver aberto */}
            {selectedClient && !showSaveModal && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Icon name="check_circle" className="text-green-500 text-sm" />
                    <span>{selectedClient.whatsapp}</span>
                    {selectedClient.nickname && (
                        <span>• {selectedClient.nickname}</span>
                    )}
                </div>
            )}

            {/* Botão para adicionar na base de clientes */}
            {showAddButton && clientName.trim() && !selectedClient && (
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Cliente não encontrado na base</span>
                    <button
                        type="button"
                        onClick={() => setShowSaveModal(true)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        <Icon name="person_add" className="text-sm" />
                        <span>Adicionar</span>
                    </button>
                </div>
            )}

            {/* Modal para salvar novo cliente */}
            <SaveClientModal
                isOpen={showSaveModal}
                onClose={() => {
                    setShowSaveModal(false);
                }}
                clientName={clientName.trim()}
                onSuccess={(client) => {
                    handleSaveClientSuccess(client);
                }}
            />
        </div>
    );
};

