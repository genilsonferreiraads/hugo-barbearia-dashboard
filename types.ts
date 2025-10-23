
export interface Service {
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
  created_at?: string;
}

export enum PaymentMethod {
  Pix = "PIX",
  CreditCard = "Crédito",
  DebitCard = "Débito",
  Cash = "Dinheiro",
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