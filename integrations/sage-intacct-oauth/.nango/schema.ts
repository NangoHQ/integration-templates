export interface Account {
  id: string;
  code?: string | undefined;
  name: string;
  type: string;
  tax_type: string;
  description: string | null;
  class: string;
  bank_account_type: string;
  reporting_code: string;
  reporting_code_name: string;
  currency_code?: string | undefined;
};

export interface SyncMetadata_sage_intacct_oauth_accounts {
};
