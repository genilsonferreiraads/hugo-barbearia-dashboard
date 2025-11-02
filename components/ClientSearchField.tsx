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
}

const Icon = ({ name, className }: { name: string; className?: string }) => 
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>;

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({
    onSelectClient,
    onValueChange,
    value = '',
    placeholder = 'Digite o nome do cliente',
    className = '',
    disabled = false,
    onSaveNewClient
}) => {
    const { clients } = useClients();
    const [clientName, setClientName] = useState(value);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Sincronizar com value externo apenas na inicialização ou quando mudar de fora
    // Não sobrescrever quando o usuário estiver digitando ativamente
    useEffect(() => {
        // Atualizar apenas se o value externo mudou E o nome interno está vazio OU é diferente
        // Isso evita sobrescrever quando o usuário está digitando
        if (value !== undefined) {
            // Só atualizar se realmente mudou e não está sendo digitado
            if (value !== clientName && (clientName === '' || !clientName)) {
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]); // Apenas value como dependência - clients e clientName são acessados dentro mas não como dependências

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
        if (onValueChange) {
            onValueChange(name);
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
                onNewClient={(clientNameValue) => {
                    // Quando clicar em "Novo Cliente", atualizar o nome e abrir modal
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

