import { z } from "zod";

export const NetsuiteMetadata = z.object({
  timezone: z.string().optional()
});

export type NetsuiteMetadata = z.infer<typeof NetsuiteMetadata>;

export const NetsuiteAddress = z.object({
  addressLine1: z.union([z.string(), z.null()]),
  addressLine2: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  state: z.union([z.string(), z.null()])
});

export type NetsuiteAddress = z.infer<typeof NetsuiteAddress>;

export const NetsuiteCustomer = z.object({
  id: z.string(),
  externalId: z.union([z.string(), z.null()]),
  name: z.string(),
  email: z.union([z.string(), z.null()]),
  taxNumber: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()]),
  addressLine1: z.union([z.string(), z.null()]),
  addressLine2: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  zip: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  state: z.union([z.string(), z.null()])
});

export type NetsuiteCustomer = z.infer<typeof NetsuiteCustomer>;

export const NetsuiteCustomerCreateInput = z.object({
  externalId: z.string(),
  name: z.string(),
  email: z.string().optional(),
  taxNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional()
});

export type NetsuiteCustomerCreateInput = z.infer<typeof NetsuiteCustomerCreateInput>;

export const NetsuiteCustomerCreateOutput = z.object({
  id: z.string()
});

export type NetsuiteCustomerCreateOutput = z.infer<typeof NetsuiteCustomerCreateOutput>;

export const NetsuiteCustomerUpdateInput = z.object({
  externalId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  taxNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  id: z.string()
});

export type NetsuiteCustomerUpdateInput = z.infer<typeof NetsuiteCustomerUpdateInput>;

export const NetsuiteCustomerUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuiteCustomerUpdateOutput = z.infer<typeof NetsuiteCustomerUpdateOutput>;

export const NetsuiteInvoiceLine = z.object({
  itemId: z.string(),
  quantity: z.number(),
  amount: z.number(),
  vatCode: z.string().optional(),
  description: z.string().optional(),
  locationId: z.string().optional()
});

export type NetsuiteInvoiceLine = z.infer<typeof NetsuiteInvoiceLine>;

export const NetsuiteCreditNote = z.object({
  id: z.string(),
  customerId: z.string(),
  currency: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  lines: NetsuiteInvoiceLine.array(),
  total: z.number(),
  status: z.string()
});

export type NetsuiteCreditNote = z.infer<typeof NetsuiteCreditNote>;

export const NetsuiteCreditNoteLine = z.object({
  itemId: z.string(),
  quantity: z.number(),
  amount: z.number(),
  vatCode: z.string().optional(),
  description: z.string().optional()
});

export type NetsuiteCreditNoteLine = z.infer<typeof NetsuiteCreditNoteLine>;

export const NetsuiteCreditNoteCreateInput = z.object({
  customerId: z.string(),
  status: z.string(),
  currency: z.string(),
  description: z.string().optional(),
  lines: NetsuiteCreditNoteLine.array()
});

export type NetsuiteCreditNoteCreateInput = z.infer<typeof NetsuiteCreditNoteCreateInput>;

export const NetsuiteCreditNoteCreateOutput = z.object({
  id: z.string()
});

export type NetsuiteCreditNoteCreateOutput = z.infer<typeof NetsuiteCreditNoteCreateOutput>;

export const NetsuiteCreditNoteUpdateInput = z.object({
  customerId: z.string(),
  status: z.string(),
  currency: z.string(),
  description: z.string().optional(),
  lines: NetsuiteCreditNoteLine.array(),
  id: z.string()
});

export type NetsuiteCreditNoteUpdateInput = z.infer<typeof NetsuiteCreditNoteUpdateInput>;

export const NetsuiteCreditNoteUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuiteCreditNoteUpdateOutput = z.infer<typeof NetsuiteCreditNoteUpdateOutput>;

export const NetsuiteInvoice = z.object({
  id: z.string(),
  customerId: z.string(),
  currency: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  lines: NetsuiteInvoiceLine.array(),
  total: z.number(),
  status: z.string()
});

export type NetsuiteInvoice = z.infer<typeof NetsuiteInvoice>;

export const NetsuiteInvoiceCreateInput = z.object({
  customerId: z.string(),
  currency: z.string(),
  description: z.string().optional(),
  status: z.string(),
  lines: NetsuiteInvoiceLine.array()
});

export type NetsuiteInvoiceCreateInput = z.infer<typeof NetsuiteInvoiceCreateInput>;

export const NetsuiteInvoiceCreateOutput = z.object({
  id: z.string()
});

export type NetsuiteInvoiceCreateOutput = z.infer<typeof NetsuiteInvoiceCreateOutput>;

export const NetsuiteInvoiceUpdateInput = z.object({
  customerId: z.string().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  lines: NetsuiteInvoiceLine.array(),
  id: z.string(),
  locationId: z.string().optional()
});

export type NetsuiteInvoiceUpdateInput = z.infer<typeof NetsuiteInvoiceUpdateInput>;

export const NetsuiteInvoiceUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuiteInvoiceUpdateOutput = z.infer<typeof NetsuiteInvoiceUpdateOutput>;

export const NetsuitePayment = z.object({
  id: z.string(),
  description: z.string().optional(),
  customerId: z.union([z.string(), z.null()]),
  amount: z.union([z.number(), z.null()]),
  createdAt: z.union([z.string(), z.null()]),
  currency: z.union([z.string(), z.null()]),
  paymentReference: z.union([z.string(), z.null()]),
  status: z.union([z.string(), z.null()]),
  applyTo: z.string().array()
});

export type NetsuitePayment = z.infer<typeof NetsuitePayment>;

export const NetsuitePaymentCreateInput = z.object({
  customerId: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentReference: z.string(),
  applyTo: z.string().array(),
  status: z.string(),
  description: z.string().optional()
});

export type NetsuitePaymentCreateInput = z.infer<typeof NetsuitePaymentCreateInput>;

export const NetsuitePaymentCreateOutput = z.object({
  id: z.string()
});

export type NetsuitePaymentCreateOutput = z.infer<typeof NetsuitePaymentCreateOutput>;

export const NetsuitePaymentUpdateInput = z.object({
  customerId: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  paymentReference: z.string().optional(),
  applyTo: z.string().optional().array(),
  status: z.string().optional(),
  description: z.string().optional(),
  id: z.string()
});

export type NetsuitePaymentUpdateInput = z.infer<typeof NetsuitePaymentUpdateInput>;

export const NetsuitePaymentUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuitePaymentUpdateOutput = z.infer<typeof NetsuitePaymentUpdateOutput>;

export const NetsuiteLocation = z.object({
  id: z.string(),
  isInactive: z.boolean(),
  name: z.string(),
  lastModifiedDate: z.string(),

  address: z.object({
    address1: z.string(),
    addressee: z.string(),
    addressText: z.string(),
    city: z.string(),
    country: z.string(),
    state: z.string(),
    zip: z.string()
  }),

  returnAddress: z.object({
    addressText: z.string(),
    country: z.string()
  }),

  timeZone: z.union([z.string(), z.null()]).optional(),
  useBins: z.boolean()
});

export type NetsuiteLocation = z.infer<typeof NetsuiteLocation>;

export const LedgerLine = z.object({
  journalLineId: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  cleared: z.boolean(),
  credit: z.number().optional(),
  debit: z.number().optional(),
  description: z.string()
});

export type LedgerLine = z.infer<typeof LedgerLine>;

export const GeneralLedger = z.object({
  id: z.string(),
  date: z.string(),
  transactionId: z.string(),
  "void": z.boolean(),
  approved: z.boolean(),
  currency: z.string(),
  createdDate: z.string(),
  updatedDate: z.string(),
  isReversal: z.boolean(),

  subsidiary: z.object({
    id: z.string(),
    name: z.string()
  }),

  lines: LedgerLine.array()
});

export type GeneralLedger = z.infer<typeof GeneralLedger>;

export const InventoryDetail = z.object({
  binNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  quantity: z.number().optional(),
  serialNumber: z.string().optional(),
  toBinNumber: z.string().optional()
});

export type InventoryDetail = z.infer<typeof InventoryDetail>;

export const PurchaseOrderLine = z.object({
  itemId: z.string(),
  quantity: z.number(),
  amount: z.number(),
  description: z.string().optional(),
  locationId: z.string().optional(),
  rate: z.number().optional(),
  department: z.string().optional(),
  "class": z.string().optional(),
  createWorkOrder: z.boolean().optional(),
  inventoryDetail: z.union([InventoryDetail, z.null()]).optional()
});

export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLine>;

export const TaxDetails = z.object({
  taxCode: z.string().optional(),
  taxRate: z.number().optional()
});

export type TaxDetails = z.infer<typeof TaxDetails>;

export const Address = z.object({
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  addr3: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional()
});

export type Address = z.infer<typeof Address>;

export const NetsuitePurchaseOrderCreateInput = z.object({
  vendorId: z.string(),
  currency: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  tranDate: z.string().optional(),
  dueDate: z.string().optional(),
  lines: PurchaseOrderLine.array(),
  customForm: z.string().optional(),
  location: z.string().optional(),
  subsidiary: z.string().optional(),
  department: z.string().optional(),
  "class": z.string().optional(),
  taxDetails: z.union([TaxDetails, z.null()]).optional(),
  billingAddress: Address,
  shippingAddress: Address
});

export type NetsuitePurchaseOrderCreateInput = z.infer<typeof NetsuitePurchaseOrderCreateInput>;

export const NetsuitePurchaseOrderCreateOutput = z.object({
  id: z.string()
});

export type NetsuitePurchaseOrderCreateOutput = z.infer<typeof NetsuitePurchaseOrderCreateOutput>;

export const NetsuitePurchaseOrderUpdateInput = z.object({
  id: z.string(),
  vendorId: z.string().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  tranDate: z.string().optional(),
  dueDate: z.string().optional(),
  lines: PurchaseOrderLine.array(),
  customForm: z.string().optional(),
  location: z.string().optional(),
  subsidiary: z.string().optional(),
  department: z.string().optional(),
  "class": z.string().optional(),
  billingAddress: z.union([Address, z.null()]).optional(),
  shippingAddress: z.union([Address, z.null()]).optional(),
  taxDetails: z.union([TaxDetails, z.null()]).optional()
});

export type NetsuitePurchaseOrderUpdateInput = z.infer<typeof NetsuitePurchaseOrderUpdateInput>;

export const NetsuitePurchaseOrderUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuitePurchaseOrderUpdateOutput = z.infer<typeof NetsuitePurchaseOrderUpdateOutput>;

export const NetsuiteBillLine = z.object({
  itemId: z.string(),
  quantity: z.number(),
  amount: z.number(),
  description: z.string().optional(),
  rate: z.number().optional(),
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  classId: z.string().optional(),
  customerId: z.string().optional(),
  isBillable: z.boolean().optional(),

  taxDetails: z.object({
    taxCode: z.string().optional(),
    taxRate: z.number().optional()
  }).optional(),

  inventoryDetail: z.object({
    binNumber: z.string().optional(),
    expirationDate: z.string().optional(),
    quantity: z.number().optional(),
    serialNumber: z.string().optional()
  }).optional()
});

export type NetsuiteBillLine = z.infer<typeof NetsuiteBillLine>;

export const NetsuiteBillCreateInput = z.object({
  vendorId: z.string(),
  tranDate: z.string(),
  currency: z.string(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  memo: z.string().optional(),
  externalId: z.string().optional(),
  location: z.string().optional(),
  subsidiary: z.string().optional(),
  department: z.string().optional(),
  "class": z.string().optional(),
  terms: z.string().optional(),
  lines: NetsuiteBillLine.array(),

  billingAddress: z.object({
    addr1: z.string().optional(),
    addr2: z.string().optional(),
    addr3: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional(),

  taxDetails: z.object({
    taxCode: z.string().optional(),
    taxRate: z.number().optional()
  }).optional()
});

export type NetsuiteBillCreateInput = z.infer<typeof NetsuiteBillCreateInput>;

export const NetsuiteBillCreateOutput = z.object({
  id: z.string()
});

export type NetsuiteBillCreateOutput = z.infer<typeof NetsuiteBillCreateOutput>;

export const NetsuiteBillUpdateInput = z.object({
  id: z.string(),
  vendorId: z.string().optional(),
  tranDate: z.string().optional(),
  currency: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  memo: z.string().optional(),
  externalId: z.string().optional(),
  location: z.string().optional(),
  subsidiary: z.string().optional(),
  department: z.string().optional(),
  "class": z.string().optional(),
  terms: z.string().optional(),
  lines: NetsuiteBillLine.array(),

  billingAddress: z.object({
    addr1: z.string().optional(),
    addr2: z.string().optional(),
    addr3: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional(),

  taxDetails: z.object({
    taxCode: z.string().optional(),
    taxRate: z.number().optional()
  }).optional()
});

export type NetsuiteBillUpdateInput = z.infer<typeof NetsuiteBillUpdateInput>;

export const NetsuiteBillUpdateOutput = z.object({
  success: z.boolean()
});

export type NetsuiteBillUpdateOutput = z.infer<typeof NetsuiteBillUpdateOutput>;

export const FetchFieldsInput = z.object({
  name: z.string()
});

export type FetchFieldsInput = z.infer<typeof FetchFieldsInput>;

export const FetchFieldsOutput = z.object({
  id: z.string().optional(),
  schema: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.union([z.string(), z.string().array()]).optional(),
  properties: z.object({}).optional(),
  required: z.string().array().optional(),
  items: z.union([FetchFieldsOutput, FetchFieldsOutput.array()]).optional(),
  "enum": z.any().array().optional(),
  definitions: z.object({}).optional(),
  additionalProperties: z.union([z.boolean(), FetchFieldsOutput]).optional(),
  "default": z.any().optional()
});

export type FetchFieldsOutput = z.infer<typeof FetchFieldsOutput>;

export const models = {
  NetsuiteMetadata: NetsuiteMetadata,
  NetsuiteAddress: NetsuiteAddress,
  NetsuiteCustomer: NetsuiteCustomer,
  NetsuiteCustomerCreateInput: NetsuiteCustomerCreateInput,
  NetsuiteCustomerCreateOutput: NetsuiteCustomerCreateOutput,
  NetsuiteCustomerUpdateInput: NetsuiteCustomerUpdateInput,
  NetsuiteCustomerUpdateOutput: NetsuiteCustomerUpdateOutput,
  NetsuiteInvoiceLine: NetsuiteInvoiceLine,
  NetsuiteCreditNote: NetsuiteCreditNote,
  NetsuiteCreditNoteLine: NetsuiteCreditNoteLine,
  NetsuiteCreditNoteCreateInput: NetsuiteCreditNoteCreateInput,
  NetsuiteCreditNoteCreateOutput: NetsuiteCreditNoteCreateOutput,
  NetsuiteCreditNoteUpdateInput: NetsuiteCreditNoteUpdateInput,
  NetsuiteCreditNoteUpdateOutput: NetsuiteCreditNoteUpdateOutput,
  NetsuiteInvoice: NetsuiteInvoice,
  NetsuiteInvoiceCreateInput: NetsuiteInvoiceCreateInput,
  NetsuiteInvoiceCreateOutput: NetsuiteInvoiceCreateOutput,
  NetsuiteInvoiceUpdateInput: NetsuiteInvoiceUpdateInput,
  NetsuiteInvoiceUpdateOutput: NetsuiteInvoiceUpdateOutput,
  NetsuitePayment: NetsuitePayment,
  NetsuitePaymentCreateInput: NetsuitePaymentCreateInput,
  NetsuitePaymentCreateOutput: NetsuitePaymentCreateOutput,
  NetsuitePaymentUpdateInput: NetsuitePaymentUpdateInput,
  NetsuitePaymentUpdateOutput: NetsuitePaymentUpdateOutput,
  NetsuiteLocation: NetsuiteLocation,
  LedgerLine: LedgerLine,
  GeneralLedger: GeneralLedger,
  InventoryDetail: InventoryDetail,
  PurchaseOrderLine: PurchaseOrderLine,
  TaxDetails: TaxDetails,
  Address: Address,
  NetsuitePurchaseOrderCreateInput: NetsuitePurchaseOrderCreateInput,
  NetsuitePurchaseOrderCreateOutput: NetsuitePurchaseOrderCreateOutput,
  NetsuitePurchaseOrderUpdateInput: NetsuitePurchaseOrderUpdateInput,
  NetsuitePurchaseOrderUpdateOutput: NetsuitePurchaseOrderUpdateOutput,
  NetsuiteBillLine: NetsuiteBillLine,
  NetsuiteBillCreateInput: NetsuiteBillCreateInput,
  NetsuiteBillCreateOutput: NetsuiteBillCreateOutput,
  NetsuiteBillUpdateInput: NetsuiteBillUpdateInput,
  NetsuiteBillUpdateOutput: NetsuiteBillUpdateOutput,
  FetchFieldsInput: FetchFieldsInput,
  FetchFieldsOutput: FetchFieldsOutput
};