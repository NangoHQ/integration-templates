export interface SyncMetadata_exact_online_customers {
};

export interface ExactCustomer {
  id: string;
  division: number | null;
  name: string;
  email: string | null;
  taxNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
};

export interface SyncMetadata_exact_online_payments {
};

export interface ExactPayment {
  id: string;
  description: string | null;
  division: number | null;
  customerId: string | null;
  amount: number | null;
  createdAt: string | null;
  currency: string | null;
  journal: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: number | null;
  transactionID: string | null;
};

export interface ActionInput_exact_online_attachfileinvoice {
  invoiceId: string;
  customerId: string;
  subject: string;
  filename: string;
  content: string;
};

export interface ActionOutput_exact_online_attachfileinvoice {
  success: boolean;
};

export interface ActionInput_exact_online_createcustomer {
  name: string;
  email?: string | null | undefined;
  taxNumber?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  zip?: string | null | undefined;
  country?: string | null | undefined;
  state?: string | null | undefined;
  phone?: string | null | undefined;
};

export interface ActionOutput_exact_online_createcustomer {
  id: string;
};

export interface ActionInput_exact_online_createinvoice {
  customerId: string;
  journal?: number | undefined;
  currency?: 'EUR' | undefined;
  description?: string | undefined;
  createdAt?: Date | undefined;
  lines: ({  itemId: string;
  quantity: number;
  amountNet: number;
  vatCode?: string | undefined;
  description?: string | undefined;})[];
};

export interface ActionOutput_exact_online_createinvoice {
  id: string;
};

export interface ActionInput_exact_online_updatecustomer {
  name?: string | null | undefined;
  email?: string | null | undefined;
  taxNumber?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  zip?: string | null | undefined;
  country?: string | null | undefined;
  state?: string | null | undefined;
  phone?: string | null | undefined;
  id: string;
};

export interface ActionOutput_exact_online_updatecustomer {
  success: boolean;
};

export interface ActionInput_exact_online_updateinvoice {
  id: string;
  deliverTo?: string | undefined;
  currency?: 'EUR' | undefined;
  description?: string | undefined;
  createdAt?: Date | undefined;
};

export interface ActionOutput_exact_online_updateinvoice {
  success: boolean;
};
