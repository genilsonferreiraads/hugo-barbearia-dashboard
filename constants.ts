import { WeeklyRevenue } from './types.ts';
import { PaymentMethod } from './types';
import { BottomSheetOption } from './components/BottomSheet';

// This is kept for the chart example, but real data should come from transactions.
export const WEEKLY_REVENUE_DATA: WeeklyRevenue[] = [
    { day: 'Seg', revenue: 0 },
    { day: 'Ter', revenue: 0 },
    { day: 'Qua', revenue: 0 },
    { day: 'Qui', revenue: 0 },
    { day: 'Sex', revenue: 0 },
    { day: 'Sáb', revenue: 0 },
    { day: 'Dom', revenue: 0 },
];

// Cores para métodos de pagamento
export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  [PaymentMethod.Pix]: '#32CD32', // Verde PIX
  [PaymentMethod.CreditCard]: '#3B82F6', // Azul (Crédito)
  [PaymentMethod.DebitCard]: '#F59E0B', // Laranja (Débito)
  [PaymentMethod.Cash]: '#10B981', // Verde esmeralda (Dinheiro)
  [PaymentMethod.Credit]: '#8B5CF6', // Roxo (Fiado)
};

// Helper para criar opções de método de pagamento com cores
export const getPaymentMethodOptions = (excludeCredit: boolean = false): BottomSheetOption[] => {
  const methods = Object.values(PaymentMethod).filter(m => 
    excludeCredit ? m !== PaymentMethod.Credit : true
  );
  
  return methods.map((method) => ({
    id: method,
    label: method,
    color: PAYMENT_METHOD_COLORS[method] || '#6b7280',
  }));
};
