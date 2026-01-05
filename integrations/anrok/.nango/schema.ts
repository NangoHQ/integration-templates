export interface ActionInput_anrok_createephemeraltransaction {
  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];
};

export interface ActionOutput_anrok_createephemeraltransaction {
  succeeded: ({  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];
  sub_total_excluding_taxes?: number | undefined;
  taxes_amount_cents?: number | undefined;})[];
  failed: ({  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];
  validation_errors?: any | undefined;})[];
};

export interface ActionInput_anrok_createorupdatetransaction {
  0: {  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];};
};

export interface ActionOutput_anrok_createorupdatetransaction {
  succeeded: ({  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];
  sub_total_excluding_taxes?: number | undefined;
  taxes_amount_cents?: number | undefined;})[];
  failed: ({  id?: string | undefined;
  issuing_date: string;
  currency: string;
  contact: {  external_id: string;
  name: string;
  address_line_1: string;
  city: string;
  zip: string;
  country: string;
  taxable: boolean;
  tax_number: string;};
  fees: ({  item_id: string;
  item_code: string | null;
  amount_cents: number | null;})[];
  validation_errors?: any | undefined;})[];
};

export interface ActionInput_anrok_negatetransaction {
  0: {  id: string;
  voided_id: string;};
};

export interface ActionOutput_anrok_negatetransaction {
  succeeded: ({  id: string;
  voided_id: string;})[];
  failed: ({  id: string;
  voided_id: string;
  validation_errors?: any | undefined;})[];
};

export interface ActionInput_anrok_voidtransaction {
  0: {  id: string;};
};

export interface ActionOutput_anrok_voidtransaction {
  succeeded: ({  id: string;})[];
  failed: ({  id: string;
  validation_errors?: any | undefined;})[];
};
