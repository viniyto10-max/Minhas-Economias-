export type TipoFormaPagamento = 'conta' | 'cartao' | 'pix' | 'dinheiro';

export interface Transaction {
  id: string;
  data_hora: Date;
  movimento: 'Entrada' | 'Saída';
  banco: string;
  categoria: string;
  responsavel: string;
  descricao: string;
  valor: number;
  confirmado: boolean;
  category_id: string | null;
  responsavel_id: string | null;
  payment_method_id: string | null;
  banco_tipo: TipoFormaPagamento | null;
  banco_cor: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Responsavel {
  id: string;
  nome: string;
  foto_url: string | null;
}

export interface PaymentMethod {
  id: string;
  nome: string;
  tipo: TipoFormaPagamento;
  cor: string;
}
