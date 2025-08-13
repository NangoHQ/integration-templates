import { z } from "zod";

export const TransactionReferenceObject = z.object({
  banking_provider: z.union([z.string(), z.null()]),
  provider_field_name: z.union([z.string(), z.null()]),
  provider_field_value: z.union([z.string(), z.null()])
});

export type TransactionReferenceObject = z.infer<typeof TransactionReferenceObject>;

export const LineItemWithTax = z.object({
  label: z.string(),
  quantity: z.number(),
  section_rank: z.number().optional(),
  currency_amount: z.number(),
  plan_item_number: z.string().optional(),
  unit: z.string(),
  vat_rate: z.string(),
  description: z.string().optional(),
  discount: z.number().optional()
});

export type LineItemWithTax = z.infer<typeof LineItemWithTax>;

export const LineItemWithoutTax = z.object({
  label: z.string(),
  quantity: z.number(),
  section_rank: z.number().optional(),
  currency_amount_before_tax: z.number(),
  plan_item_number: z.string().optional(),
  unit: z.string(),
  vat_rate: z.string(),
  description: z.string().optional(),
  discount: z.number().optional()
});

export type LineItemWithoutTax = z.infer<typeof LineItemWithoutTax>;

export const LineItemWithExistingProduct = z.object({
  label: z.string().optional(),
  quantity: z.number(),
  discount: z.number().optional(),
  section_rank: z.number().optional(),
  plan_item_number: z.string().optional(),

  product: z.object({
    source_id: z.string(),
    price: z.number().optional(),
    vat_rate: z.string().optional(),
    unit: z.string().optional()
  })
});

export type LineItemWithExistingProduct = z.infer<typeof LineItemWithExistingProduct>;

export const CategoryObject = z.object({
  source_id: z.string(),
  weight: z.union([z.number(), z.null()]),
  amount: z.union([z.number(), z.null()])
});

export type CategoryObject = z.infer<typeof CategoryObject>;

export const LineItemsSectionsAttributesObject = z.object({
  title: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  rank: z.number()
});

export type LineItemsSectionsAttributesObject = z.infer<typeof LineItemsSectionsAttributesObject>;

export const CreateInvoice = z.object({
  create_customer: z.boolean().optional(),
  create_products: z.boolean().optional(),
  update_customer: z.boolean().optional(),
  date: z.string(),
  deadline: z.string(),
  draft: z.boolean().optional(),
  customer_source_id: z.string(),
  external_id: z.union([z.string(), z.null()]).optional(),
  pdf_invoice_free_text: z.union([z.string(), z.null()]).optional(),
  pdf_invoice_subject: z.union([z.string(), z.null()]).optional(),
  currency: z.string().optional(),
  special_mention: z.union([z.string(), z.null()]).optional(),
  discount: z.number().optional(),
  language: z.string().optional(),
  transactions_reference: TransactionReferenceObject,

  line_items: z.union([
    LineItemWithTax.array(),
    LineItemWithoutTax.array(),
    LineItemWithExistingProduct.array()
  ]),

  categories: CategoryObject.array(),
  line_items_sections_attributes: LineItemsSectionsAttributesObject.array(),

  imputation_dates: z.object({
    start_date: z.string(),
    end_date: z.string()
  }).optional()
});

export type CreateInvoice = z.infer<typeof CreateInvoice>;

export const ImputationDateObject = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export type ImputationDateObject = z.infer<typeof ImputationDateObject>;

export const DeliveryAddressObject = z.object({
  address: z.string().optional(),
  postal_code: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  country_alpha2: z.union([z.string(), z.null()]).optional()
});

export type DeliveryAddressObject = z.infer<typeof DeliveryAddressObject>;

export const PennylaneIndividualCustomer = z.object({
  customer_type: z.string().optional(),
  first_name: z.string(),
  last_name: z.string(),
  country_alpha2: z.string(),
  gender: z.union([z.string(), z.null()]).optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  source_id: z.string().optional(),
  emails: z.string().array().optional(),
  billing_iban: z.string().optional(),
  delivery_address: z.union([z.string(), DeliveryAddressObject]).optional(),
  vat_number: z.union([z.string(), z.null()]).optional(),
  delivery_postal_code: z.string().optional(),
  delivery_city: z.string().optional(),
  delivery_country_alpha2: z.string().optional(),
  payment_conditions: z.string().optional(),
  phone: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),

  mandate: z.object({
    provider: z.string().optional(),
    source_id: z.string()
  }).optional(),

  plan_item: z.object({
    number: z.string().optional(),
    label: z.string().optional(),
    enabled: z.boolean().optional(),
    vat_rate: z.string().optional(),
    country_alpha2: z.string().optional(),
    description: z.string().optional()
  }).optional()
});

export type PennylaneIndividualCustomer = z.infer<typeof PennylaneIndividualCustomer>;

export const InvoiceLineItem = z.object({
  id: z.number().optional(),
  label: z.string().optional(),
  unit: z.union([z.string(), z.null()]).optional(),
  quantity: z.string().optional(),
  amount: z.string().optional(),
  currency_amount: z.string().optional(),
  description: z.string().optional(),
  product_id: z.union([z.string(), z.null()]).optional(),
  vat_rate: z.string().optional(),
  currency_price_before_tax: z.string().optional(),
  currency_tax: z.string().optional(),
  raw_currency_unit_price: z.string().optional(),
  discount: z.string().optional(),
  discount_type: z.string().optional(),
  section_rank: z.union([z.number(), z.null()]).optional(),
  v2_id: z.union([z.number(), z.null()]).optional(),
  product_v2_id: z.union([z.number(), z.null()]).optional()
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItem>;

export const InvoiceCategory = z.object({
  source_id: z.string(),
  weight: z.string(),
  label: z.string(),
  direction: z.union([z.string(), z.null()]),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()])
});

export type InvoiceCategory = z.infer<typeof InvoiceCategory>;

export const PaymentsObject = z.object({
  label: z.string(),
  created_at: z.union([z.date(), z.string()]),
  currency_amount: z.string()
});

export type PaymentsObject = z.infer<typeof PaymentsObject>;

export const MatchedTransactionsObject = z.object({
  label: z.union([z.string(), z.null()]),
  amount: z.union([z.string(), z.null()]),
  group_uuid: z.union([z.string(), z.null()]),
  date: z.union([z.date(), z.null()]),
  fee: z.union([z.string(), z.null()]),
  currency: z.string()
});

export type MatchedTransactionsObject = z.infer<typeof MatchedTransactionsObject>;

export const BillingSubscriptionObject = z.object({
  id: z.union([z.string(), z.null()])
});

export type BillingSubscriptionObject = z.infer<typeof BillingSubscriptionObject>;

export const UpdateInvoice = z.object({
  id: z.string(),
  label: z.union([z.string(), z.null()]).optional(),
  invoice_number: z.union([z.string(), z.null()]).optional(),
  quote_group_uuid: z.string().optional(),
  is_draft: z.boolean().optional(),
  is_estimate: z.boolean().optional(),
  currency: z.string().optional(),
  amount: z.string().optional(),
  currency_amount: z.string().optional(),
  currency_amount_before_tax: z.string().optional(),
  exchange_rate: z.number().optional(),
  date: z.union([z.string(), z.null()]).optional(),
  deadline: z.union([z.string(), z.null()]).optional(),
  currency_tax: z.string().optional(),
  language: z.string().optional(),
  paid: z.boolean().optional(),
  fully_paid_at: z.union([z.string(), z.null()]).optional(),
  status: z.union([z.string(), z.null()]).optional(),
  discount: z.string().optional(),
  discount_type: z.string().optional(),
  public_url: z.string().optional(),
  file_url: z.union([z.string(), z.null()]).optional(),
  filename: z.string().optional(),
  remaining_amount: z.string().optional(),
  source: z.literal("InvoiceSource").optional(),
  special_mention: z.union([z.string(), z.null()]).optional(),
  updated_at: z.string().optional(),
  imputation_dates: z.union([ImputationDateObject, z.null()]).optional(),
  customer: PennylaneIndividualCustomer,
  line_items_sections_attributes: LineItemsSectionsAttributesObject.array(),
  line_items: InvoiceLineItem.array(),
  categories: InvoiceCategory.array(),
  transactions_reference: TransactionReferenceObject,
  payments: PaymentsObject.array(),
  matched_transactions: MatchedTransactionsObject.array(),
  pdf_invoice_free_text: z.string().optional(),
  pdf_invoice_subject: z.string().optional(),
  billing_subscription: z.union([BillingSubscriptionObject, z.null()]).optional()
});

export type UpdateInvoice = z.infer<typeof UpdateInvoice>;

export const UpdateInvoiceResponse = z.object({
  invoice: UpdateInvoice
});

export type UpdateInvoiceResponse = z.infer<typeof UpdateInvoiceResponse>;

export const CreateSupplier = z.object({
  name: z.string(),
  reg_no: z.string().optional(),
  address: z.string(),
  postal_code: z.string(),
  city: z.string(),
  country_alpha2: z.string(),
  recipient: z.string().optional(),
  vat_number: z.string().optional(),
  source_id: z.string().optional(),
  emails: z.string().array(),
  iban: z.string().optional(),
  payment_conditions: z.string().optional(),
  phone: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

export type CreateSupplier = z.infer<typeof CreateSupplier>;

export const UpdateSupplier = z.object({
  source_id: z.string(),
  name: z.string().optional(),
  reg_no: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_alpha2: z.string().optional(),
  recipient: z.string().optional(),
  vat_number: z.string().optional(),
  emails: z.string().optional().array(),
  iban: z.string().optional(),
  payment_conditions: z.string().optional(),
  phone: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

export type UpdateSupplier = z.infer<typeof UpdateSupplier>;

export const UpdateSupplierResponse = z.object({
  supplier: z.object({
    source_id: z.string(),
    name: z.string().optional(),
    reg_no: z.string().optional(),
    address: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    country_alpha2: z.string().optional(),
    recipient: z.string().optional(),
    vat_number: z.string().optional(),
    emails: z.string().optional().array(),
    iban: z.string().optional(),
    payment_conditions: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional()
  })
});

export type UpdateSupplierResponse = z.infer<typeof UpdateSupplierResponse>;

export const PennylaneInvoice = z.object({
  id: z.string(),
  amount: z.union([z.string(), z.null()]),
  billing_subscription: z.union([BillingSubscriptionObject, z.null()]).optional(),
  categories: z.union([InvoiceCategory.array(), z.null()]).optional(),
  currency: z.union([z.string(), z.null()]),
  currency_amount: z.union([z.string(), z.null()]),
  currency_amount_before_tax: z.union([z.string(), z.null()]).optional(),
  currency_tax: z.union([z.string(), z.null()]),
  customer: PennylaneIndividualCustomer.optional(),
  customer_name: z.string(),
  customer_validation_needed: z.union([z.boolean(), z.null()]),
  date: z.union([z.date(), z.string()]).optional(),
  deadline: z.union([z.string(), z.null()]),
  discount: z.union([z.string(), z.null()]),
  discount_type: z.union([z.string(), z.null()]).optional(),
  exchange_rate: z.union([z.number(), z.null()]),
  file_url: z.union([z.string(), z.null()]),
  filename: z.union([z.string(), z.null()]),
  fully_paid_at: z.union([z.date(), z.null()]).optional(),
  imputation_dates: z.union([ImputationDateObject, z.null()]),
  invoice_number: z.union([z.string(), z.null()]).optional(),
  is_draft: z.boolean(),
  is_estimate: z.boolean().optional(),
  label: z.union([z.string(), z.null()]).optional(),
  language: z.union([z.string(), z.null()]).optional(),
  line_items: InvoiceLineItem.array(),
  line_items_sections_attributes: LineItemsSectionsAttributesObject.array(),
  matched_transactions: MatchedTransactionsObject.array(),
  paid: z.boolean(),
  payments: z.object({}).array(),
  pdf_invoice_free_text: z.string(),
  pdf_invoice_subject: z.string(),
  public_url: z.union([z.string(), z.null()]),
  quote_group_uuid: z.union([z.string(), z.null()]).optional(),
  remaining_amount: z.union([z.string(), z.null()]),
  source: z.union([z.string(), z.null()]),
  special_mention: z.union([z.string(), z.null()]),
  status: z.union([z.string(), z.null()]),
  transactions_reference: z.union([TransactionReferenceObject, z.null()]).optional(),
  updated_at: z.union([z.date(), z.string()])
});

export type PennylaneInvoice = z.infer<typeof PennylaneInvoice>;

export const InvoiceResponse = z.object({
  invoice: PennylaneInvoice
});

export type InvoiceResponse = z.infer<typeof InvoiceResponse>;

export const UpdateIndividualCustomer = z.object({
  id: z.string(),
  customer: PennylaneIndividualCustomer
});

export type UpdateIndividualCustomer = z.infer<typeof UpdateIndividualCustomer>;

export const MandateObject = z.object({
  provider: z.string(),
  source_id: z.string()
});

export type MandateObject = z.infer<typeof MandateObject>;

export const IndividualCustomerResponse = z.object({
  customer: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    gender: z.union([z.string(), z.null()]).optional(),
    name: z.string().optional(),
    updated_at: z.string().optional(),
    source_id: z.string(),
    emails: z.string().optional().array(),
    billing_iban: z.union([z.string(), z.null()]).optional(),
    customer_type: z.string().optional(),
    recipient: z.string().optional(),

    billing_address: z.object({
      address: z.string().optional(),
      postal_code: z.string().optional(),
      city: z.string().optional(),
      country_alpha2: z.string().optional()
    }).optional(),

    delivery_address: z.object({
      address: z.string().optional(),
      postal_code: z.string().optional(),
      city: z.string().optional(),
      country_alpha2: z.string().optional()
    }).optional(),

    payment_conditions: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),

    plan_item: z.object({
      number: z.string(),
      label: z.string(),
      enabled: z.boolean(),
      vat_rate: z.string(),
      country_alpha2: z.string(),
      description: z.string()
    }).optional(),

    mandates: MandateObject.array()
  })
});

export type IndividualCustomerResponse = z.infer<typeof IndividualCustomerResponse>;

export const PennylaneSuccessResponse = z.object({
  success: z.boolean(),
  source_id: z.string()
});

export type PennylaneSuccessResponse = z.infer<typeof PennylaneSuccessResponse>;

export const UpdatePennylaneCustomer = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  vat_number: z.union([z.string(), z.null()]).optional(),
  postal_code: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  country_alpha2: z.union([z.string(), z.null()]).optional(),
  recipient: z.union([z.string(), z.null()]).optional(),
  source_id: z.union([z.string(), z.null()]).optional(),
  emails: z.union([z.string().array(), z.null()]).optional(),
  billing_iban: z.union([z.string(), z.null()]).optional(),
  delivery_address: z.union([DeliveryAddressObject, z.null()]).optional(),
  delivery_postal_code: z.union([z.string(), z.null()]).optional(),
  delivery_country: z.union([z.string(), z.null()]).optional(),
  delivery_country_alpha2: z.union([z.string(), z.null()]).optional(),
  payment_conditions: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  reference: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional()
});

export type UpdatePennylaneCustomer = z.infer<typeof UpdatePennylaneCustomer>;

export const PennylaneCustomer = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  vat_number: z.union([z.string(), z.null()]).optional(),
  postal_code: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  country_alpha2: z.union([z.string(), z.null()]).optional(),
  recipient: z.union([z.string(), z.null()]).optional(),
  source_id: z.union([z.string(), z.null()]).optional(),
  emails: z.union([z.string().array(), z.null()]).optional(),
  billing_iban: z.union([z.string(), z.null()]).optional(),
  delivery_address: z.union([DeliveryAddressObject, z.null()]).optional(),
  delivery_postal_code: z.union([z.string(), z.null()]).optional(),
  delivery_country_alpha2: z.union([z.string(), z.null()]).optional(),
  payment_conditions: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  reference: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional()
});

export type PennylaneCustomer = z.infer<typeof PennylaneCustomer>;

export const PennylaneSupplier = z.object({
  name: z.string(),
  id: z.string(),
  reg_no: z.string().optional(),
  address: z.string(),
  postal_code: z.string(),
  city: z.string(),
  country_alpha2: z.string(),
  recipient: z.string().optional(),
  vat_number: z.string().optional(),
  source_id: z.string().optional(),
  emails: z.string().array(),
  iban: z.string().optional(),
  payment_conditions: z.string().optional(),
  phone: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

export type PennylaneSupplier = z.infer<typeof PennylaneSupplier>;

export const CreateProduct = z.object({
  source_id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  unit: z.string(),
  price_before_tax: z.number().optional(),
  price: z.number(),
  vat_rate: z.string(),
  currency: z.string(),
  reference: z.union([z.string(), z.null()]).optional(),
  substance: z.union([z.string(), z.null()]).optional()
});

export type CreateProduct = z.infer<typeof CreateProduct>;

export const UpdateProduct = z.object({
  source_id: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  price_before_tax: z.number().optional(),
  price: z.number().optional(),
  vat_rate: z.string().optional(),
  currency: z.string().optional(),
  reference: z.union([z.string(), z.null()]).optional(),
  substance: z.union([z.string(), z.null()]).optional()
});

export type UpdateProduct = z.infer<typeof UpdateProduct>;

export const PennylaneProduct = z.object({
  id: z.string(),
  source_id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  unit: z.string(),
  price_before_tax: z.number().optional(),
  price: z.number(),
  vat_rate: z.string(),
  currency: z.string(),
  reference: z.union([z.string(), z.null()]).optional(),
  substance: z.union([z.string(), z.null()]).optional()
});

export type PennylaneProduct = z.infer<typeof PennylaneProduct>;

export const InvoiceMapper = z.object({
  create_customer: z.boolean(),
  create_products: z.boolean(),
  update_customer: z.boolean(),

  invoice: z.object({
    date: z.string(),
    deadline: z.string(),
    draft: z.boolean(),

    customer: z.object({
      source_id: z.string()
    }),

    currency: z.string(),

    line_items: z.union([
      LineItemWithTax.array(),
      LineItemWithoutTax.array(),
      LineItemWithExistingProduct.array()
    ]),

    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    special_mention: z.union([z.string(), z.null()]),
    discount: z.number(),
    categories: z.union([CategoryObject.array(), z.null()]),

    transactions_reference: z.object({
      banking_provider: z.string(),
      provider_field_name: z.string(),
      provider_field_value: z.string()
    }).optional(),

    imputation_dates: z.object({
      start_date: z.string(),
      end_date: z.string()
    }).optional()
  })
});

export type InvoiceMapper = z.infer<typeof InvoiceMapper>;

export const models = {
  TransactionReferenceObject: TransactionReferenceObject,
  LineItemWithTax: LineItemWithTax,
  LineItemWithoutTax: LineItemWithoutTax,
  LineItemWithExistingProduct: LineItemWithExistingProduct,
  CategoryObject: CategoryObject,
  LineItemsSectionsAttributesObject: LineItemsSectionsAttributesObject,
  CreateInvoice: CreateInvoice,
  ImputationDateObject: ImputationDateObject,
  DeliveryAddressObject: DeliveryAddressObject,
  PennylaneIndividualCustomer: PennylaneIndividualCustomer,
  InvoiceLineItem: InvoiceLineItem,
  InvoiceCategory: InvoiceCategory,
  PaymentsObject: PaymentsObject,
  MatchedTransactionsObject: MatchedTransactionsObject,
  BillingSubscriptionObject: BillingSubscriptionObject,
  UpdateInvoice: UpdateInvoice,
  UpdateInvoiceResponse: UpdateInvoiceResponse,
  CreateSupplier: CreateSupplier,
  UpdateSupplier: UpdateSupplier,
  UpdateSupplierResponse: UpdateSupplierResponse,
  PennylaneInvoice: PennylaneInvoice,
  InvoiceResponse: InvoiceResponse,
  UpdateIndividualCustomer: UpdateIndividualCustomer,
  MandateObject: MandateObject,
  IndividualCustomerResponse: IndividualCustomerResponse,
  PennylaneSuccessResponse: PennylaneSuccessResponse,
  UpdatePennylaneCustomer: UpdatePennylaneCustomer,
  PennylaneCustomer: PennylaneCustomer,
  PennylaneSupplier: PennylaneSupplier,
  CreateProduct: CreateProduct,
  UpdateProduct: UpdateProduct,
  PennylaneProduct: PennylaneProduct,
  InvoiceMapper: InvoiceMapper
};
