<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Sistema de Gestão para Barbearia

Dashboard completo para gerenciamento de barbearia com agendamentos, vendas, produtos e vendas no fiado.

## 🚀 Funcionalidades

- ✅ Agendamento de clientes
- ✅ Registro de serviços e atendimentos
- ✅ Controle de produtos e vendas
- ✅ **Vendas no fiado com parcelamento**
- ✅ Relatórios financeiros
- ✅ Dashboard com estatísticas
- ✅ Tema claro/escuro
- ✅ Autenticação de usuários

## 📋 Pré-requisitos

- Node.js 16+
- Conta no [Supabase](https://supabase.com)
- Conta no Google AI Studio (opcional, para IA)

## 🔧 Instalação e Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
GEMINI_API_KEY=sua_chave_gemini_api
```

### 3. Configurar o Banco de Dados (Supabase)

#### 3.1. Criar as Tabelas Principais

No SQL Editor do Supabase, execute os seguintes scripts **nesta ordem**:

1. Crie as tabelas básicas (serviços, produtos, agendamentos, transações)
2. Execute `supabase_credit_sales_tables.sql` para criar as tabelas de vendas no fiado

#### 3.2. **IMPORTANTE**: Configurar Políticas RLS

**⚠️ Sem este passo, as vendas no fiado não aparecerão!**

No SQL Editor do Supabase, execute:

```bash
supabase_credit_sales_rls_policies.sql
```

Este script configura as permissões necessárias para que os dados sejam acessíveis.

### 4. Executar o Aplicativo

```bash
npm run dev
```

Acesse: http://localhost:5173

## 🐛 Problemas Comuns

### Vendas no Fiado Aparecem em Branco

**Sintoma**: Você criou vendas no fiado, mas a página aparece em branco/vazia.

**🔍 Diagnóstico Automático** (Novo!):
1. Execute o aplicativo: `npm run dev`
2. Vá em **Vendas → Vendas no Fiado**
3. Um **card amarelo de debug** aparecerá mostrando exatamente qual é o problema
4. Abra o Console (F12) para ver logs detalhados
5. Siga as instruções mostradas no card

**Causa Mais Comum**: Falta de políticas RLS (Row Level Security) no Supabase.

**Solução Rápida**: 
1. Leia o guia: [`SOLUCAO_RAPIDA_FIADO.md`](SOLUCAO_RAPIDA_FIADO.md)
2. Execute o script `supabase_credit_sales_rls_policies.sql` no Supabase
3. Faça logout e login novamente

**Guias Disponíveis**:
- [`COMO_USAR_DEBUG.md`](COMO_USAR_DEBUG.md) - Como usar o sistema de debug (COMECE AQUI!)
- [`PROBLEMA_RESOLVIDO.md`](PROBLEMA_RESOLVIDO.md) - Resumo completo da solução
- [`SOLUCAO_RAPIDA_FIADO.md`](SOLUCAO_RAPIDA_FIADO.md) - Solução em 3 passos
- [`CORRIGIR_VENDAS_FIADO.md`](CORRIGIR_VENDAS_FIADO.md) - Guia detalhado
- [`GUIA_VISUAL_CORRECAO.md`](GUIA_VISUAL_CORRECAO.md) - Guia com diagramas visuais

## 📁 Estrutura do Projeto

```
├── components/           # Componentes React
│   ├── CreditSalesList.tsx
│   ├── CreditSaleDetailPage.tsx
│   ├── Sales.tsx
│   └── ...
├── services/            # Serviços (Supabase, Gemini)
├── contexts.tsx         # Contextos React (estados globais)
├── types.ts            # Definições de tipos TypeScript
└── supabase_*.sql      # Scripts SQL para configuração
```

## 📄 Arquivos SQL Importantes

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| `supabase_credit_sales_tables.sql` | Cria as tabelas de vendas no fiado | Uma vez, na configuração inicial |
| `supabase_credit_sales_rls_policies.sql` | **Configura permissões (RLS)** | **Obrigatório para vendas no fiado funcionarem** |
| `supabase_products_table.sql` | Cria a tabela de produtos | Uma vez, na configuração inicial |
| `supabase_verificar_dados.sql` | Script de diagnóstico | Quando houver problemas |

## 🔒 Segurança

Este projeto usa Row Level Security (RLS) do Supabase para proteger os dados. Certifique-se de:

- ✅ Executar os scripts de políticas RLS
- ✅ Configurar autenticação corretamente
- ✅ Não expor as chaves de API no código frontend

## 🛠️ Tecnologias Utilizadas

- **React** + TypeScript
- **Vite** (bundler)
- **Tailwind CSS** (estilização)
- **Supabase** (backend/banco de dados)
- **React Router** (navegação)
- **Google Gemini AI** (opcional)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os guias de solução de problemas:
   - [`SOLUCAO_RAPIDA_FIADO.md`](SOLUCAO_RAPIDA_FIADO.md) - Solução rápida
   - [`CORRIGIR_VENDAS_FIADO.md`](CORRIGIR_VENDAS_FIADO.md) - Guia completo
2. Use o script de diagnóstico: `supabase_verificar_dados.sql`
3. Verifique o console do navegador (F12) para erros

## 📝 Licença

Este projeto foi desenvolvido para uso em barbearias.

---

**Dica**: Sempre faça backup do seu banco de dados antes de executar scripts SQL!
