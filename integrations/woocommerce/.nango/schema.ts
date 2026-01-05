export interface Customer {
  id: string;
  name: string;
  email: string;
  is_paying_customer: boolean;
  created_at: string;
  modified_at: string;
};

export interface Order {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  modified_at: string;
};

export interface SyncMetadata_woocommerce_customers {
};

export interface SyncMetadata_woocommerce_orders {
};
