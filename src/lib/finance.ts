export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatCurrencyInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const parseCurrencyInput = (masked: string): number => {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('pt-BR');

export const formatDateShort = (date: string): string =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const maskValue = (privacy: boolean, text: string): string =>
  privacy ? '•••••' : text;

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 10);

export const getMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export const accountTypeLabel: Record<string, string> = {
  wallet: 'Carteira',
  checking: 'Conta Corrente',
  digital: 'Conta Digital',
  investment: 'Investimentos',
};

export const accountTypeIcon: Record<string, string> = {
  wallet: 'wallet-outline',
  checking: 'business-outline',
  digital: 'phone-portrait-outline',
  investment: 'trending-up-outline',
};
