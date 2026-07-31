import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    PurchaseOrderNumber: z.string().describe('Purchase order number. Example: "DAT-000046"'),
    PurchaseOrderName: z.string().optional().nullable().describe('Purchase order name or description'),
    VendorOrderReference: z.string().optional().nullable().describe('Vendor order reference number'),
    RequestedDeliveryDate: z.string().datetime().optional().describe('Requested delivery date in ISO 8601 format'),
    DeliveryTermsId: z.string().optional().describe('Delivery terms code'),
    PaymentTermsName: z.string().optional().describe('Payment terms name'),
    AttentionInformation: z.string().optional().nullable().describe('Attention information'),
    OrderVendorAccountNumber: z.string().optional().describe('Order vendor account number'),
    InvoiceVendorAccountNumber: z.string().optional().describe('Invoice vendor account number'),
    BuyerGroupId: z.string().optional().describe('Buyer group ID'),
    ProjectId: z.string().optional().describe('Project ID'),
    ReasonCode: z.string().optional().describe('Reason code')
});

const ProviderPurchaseOrderHeaderSchema = z.object({
    dataAreaId: z.string(),
    PurchaseOrderNumber: z.string(),
    PurchaseOrderName: z.string().optional().nullable(),
    VendorOrderReference: z.string().optional().nullable(),
    RequestedDeliveryDate: z.string().optional().nullable(),
    DeliveryTermsId: z.string().optional().nullable(),
    PaymentTermsName: z.string().optional().nullable(),
    AttentionInformation: z.string().optional().nullable(),
    OrderVendorAccountNumber: z.string().optional().nullable(),
    InvoiceVendorAccountNumber: z.string().optional().nullable(),
    BuyerGroupId: z.string().optional().nullable(),
    ProjectId: z.string().optional().nullable(),
    ReasonCode: z.string().optional().nullable(),
    CurrencyCode: z.string().optional().nullable(),
    PurchaseOrderStatus: z.string().optional().nullable(),
    DocumentApprovalStatus: z.string().optional().nullable(),
    AccountingDate: z.string().optional().nullable()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    PurchaseOrderNumber: z.string(),
    PurchaseOrderName: z.string().optional(),
    VendorOrderReference: z.string().optional(),
    RequestedDeliveryDate: z.string().optional(),
    DeliveryTermsId: z.string().optional(),
    PaymentTermsName: z.string().optional(),
    AttentionInformation: z.string().optional(),
    OrderVendorAccountNumber: z.string().optional(),
    InvoiceVendorAccountNumber: z.string().optional(),
    BuyerGroupId: z.string().optional(),
    ProjectId: z.string().optional(),
    ReasonCode: z.string().optional(),
    CurrencyCode: z.string().optional(),
    PurchaseOrderStatus: z.string().optional(),
    DocumentApprovalStatus: z.string().optional(),
    AccountingDate: z.string().optional()
});

const action = createAction({
    description: 'Update a purchase order header',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const url = `/data/PurchaseOrderHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',PurchaseOrderNumber='${encodeURIComponent(input.PurchaseOrderNumber.replace(/'/g, "''"))}')`;

        const patchBody: Record<string, unknown> = {};

        if (input.PurchaseOrderName !== undefined) {
            patchBody['PurchaseOrderName'] = input.PurchaseOrderName;
        }
        if (input.VendorOrderReference !== undefined) {
            patchBody['VendorOrderReference'] = input.VendorOrderReference;
        }
        if (input.RequestedDeliveryDate !== undefined) {
            patchBody['RequestedDeliveryDate'] = input.RequestedDeliveryDate;
        }
        if (input.DeliveryTermsId !== undefined) {
            patchBody['DeliveryTermsId'] = input.DeliveryTermsId;
        }
        if (input.PaymentTermsName !== undefined) {
            patchBody['PaymentTermsName'] = input.PaymentTermsName;
        }
        if (input.AttentionInformation !== undefined) {
            patchBody['AttentionInformation'] = input.AttentionInformation;
        }
        if (input.OrderVendorAccountNumber !== undefined) {
            patchBody['OrderVendorAccountNumber'] = input.OrderVendorAccountNumber;
        }
        if (input.InvoiceVendorAccountNumber !== undefined) {
            patchBody['InvoiceVendorAccountNumber'] = input.InvoiceVendorAccountNumber;
        }
        if (input.BuyerGroupId !== undefined) {
            patchBody['BuyerGroupId'] = input.BuyerGroupId;
        }
        if (input.ProjectId !== undefined) {
            patchBody['ProjectId'] = input.ProjectId;
        }
        if (input.ReasonCode !== undefined) {
            patchBody['ReasonCode'] = input.ReasonCode;
        }

        if (Object.keys(patchBody).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields_to_update',
                message: 'At least one field to update must be provided.'
            });
        }

        await nango.patch({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: url,
            data: patchBody,
            params: {
                'cross-company': 'true'
            },
            retries: 1
        });

        const getResponse = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: url,
            params: {
                'cross-company': 'true'
            },
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'read_after_update_failed',
                message: 'GET request after PATCH did not return a response body.',
                purchaseOrderNumber: input.PurchaseOrderNumber,
                dataAreaId: input.dataAreaId
            });
        }

        const providerPo = ProviderPurchaseOrderHeaderSchema.parse(getResponse.data);

        return {
            dataAreaId: providerPo.dataAreaId,
            PurchaseOrderNumber: providerPo.PurchaseOrderNumber,
            ...(providerPo.PurchaseOrderName != null && { PurchaseOrderName: providerPo.PurchaseOrderName }),
            ...(providerPo.VendorOrderReference != null && { VendorOrderReference: providerPo.VendorOrderReference }),
            ...(providerPo.RequestedDeliveryDate != null && { RequestedDeliveryDate: providerPo.RequestedDeliveryDate }),
            ...(providerPo.DeliveryTermsId != null && { DeliveryTermsId: providerPo.DeliveryTermsId }),
            ...(providerPo.PaymentTermsName != null && { PaymentTermsName: providerPo.PaymentTermsName }),
            ...(providerPo.AttentionInformation != null && { AttentionInformation: providerPo.AttentionInformation }),
            ...(providerPo.OrderVendorAccountNumber != null && { OrderVendorAccountNumber: providerPo.OrderVendorAccountNumber }),
            ...(providerPo.InvoiceVendorAccountNumber != null && { InvoiceVendorAccountNumber: providerPo.InvoiceVendorAccountNumber }),
            ...(providerPo.BuyerGroupId != null && { BuyerGroupId: providerPo.BuyerGroupId }),
            ...(providerPo.ProjectId != null && { ProjectId: providerPo.ProjectId }),
            ...(providerPo.ReasonCode != null && { ReasonCode: providerPo.ReasonCode }),
            ...(providerPo.CurrencyCode != null && { CurrencyCode: providerPo.CurrencyCode }),
            ...(providerPo.PurchaseOrderStatus != null && { PurchaseOrderStatus: providerPo.PurchaseOrderStatus }),
            ...(providerPo.DocumentApprovalStatus != null && { DocumentApprovalStatus: providerPo.DocumentApprovalStatus }),
            ...(providerPo.AccountingDate != null && { AccountingDate: providerPo.AccountingDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
