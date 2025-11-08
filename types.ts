
export interface Service {
  id: number;
  name: string;
  price: number;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  created_at?: string;
}

export enum AppointmentStatus {
  Confirmed = "Confirmado",
  Arrived = "Chegou",
  Attended = "Atendido",
}

export interface Appointment {
  id: number;
  time: string;
  clientName: string;
  service: string;
  status: AppointmentStatus;
  date: string; // YYYY-MM-DD
  clientId?: number; // ID do cliente na tabela clients (null se não foi salvo na base)
  created_at?: string;
}

export enum PaymentMethod {
  Pix = "PIX",
  CreditCard = "Crédito",
  DebitCard = "Débito",
  Cash = "Dinheiro",
  Credit = "Fiado", // Venda no fiado
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  clientName: string;
  service: string;
  paymentMethod: string; // Now a string to hold one or more methods
  value: number; // Final total after discount
  subtotal: number;
  discount: number;
  type?: 'service' | 'product'; // Tipo da transação: serviço ou produto
  clientId?: number; // ID do cliente na tabela clients (null se não foi salvo na base)
  created_at?: string;
}

export interface DailyStats {
  totalRevenue: number;
  servicesCompleted: number;
  averageTicket: number;
}

export interface WeeklyRevenue {
    day: string;
    revenue: number;
}

// --- FIADO / CREDIT SALES ---
export enum InstallmentStatus {
  Pending = "Pendente",
  Paid = "Paga",
  Overdue = "Atrasada",
}

export enum CreditSaleStatus {
  Active = "Em Aberto",
  Paid = "Quitado",
  Overdue = "Atrasado",
}

export interface Installment {
  id: number;
  creditSaleId: number;
  installmentNumber: number; // Número da parcela (1, 2, 3...)
  amount: number; // Valor da parcela
  dueDate: string; // YYYY-MM-DD - Data de vencimento
  status: InstallmentStatus;
  paidDate?: string; // YYYY-MM-DD - Data de pagamento (se paga)
  paymentMethod?: string; // Método de pagamento usado (se paga)
  created_at?: string;
}

export interface CreditSale {
  id: number;
  clientName: string;
  products: string; // Descrição dos produtos (mesmo formato do Transaction.service)
  totalAmount: number; // Valor total
  subtotal: number;
  discount: number;
  numberOfInstallments: number;
  firstDueDate: string; // YYYY-MM-DD - Data do primeiro vencimento
  status: CreditSaleStatus;
  totalPaid: number; // Total já pago
  remainingAmount: number; // Valor restante
  date: string; // YYYY-MM-DD - Data da venda
  clientId?: number; // ID do cliente na tabela clients (null se não foi salvo na base)
  created_at?: string;
}

export interface SystemSettings {
  creditSalesEnabled: boolean; // Se fiado está ativado
}

// --- CLIENTES ---
export interface Client {
  id: number;
  fullName: string; // Nome completo (obrigatório)
  whatsapp: string; // WhatsApp (obrigatório)
  nickname?: string; // Apelido (opcional)
  observation?: string; // Observação (opcional)
  cpf?: string; // CPF (opcional)
  created_at?: string;
}

// --- DESPESAS ---
export interface Expense {
  id: number;
  description: string; // Descrição da despesa
  amount: number; // Valor da despesa
  date: string; // YYYY-MM-DD - Data da despesa
  category?: string; // Categoria da despesa (opcional)
  created_at?: string;
}

// --- CATEGORIAS DE DESPESAS ---
export interface ExpenseCategory {
  id: number;
  name: string; // Nome da categoria
  color: string; // Cor da categoria (hexadecimal)
  created_at?: string;
}