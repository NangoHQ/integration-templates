import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/data area ID. Example: "dat"'),
    purchaseOrderNumber: z.string().describe('Purchase order number. Example: "DAT-000046"'),
    purchaseOrderName: z.string().optional().describe('Purchase order name/description'),
    vendorOrderReference: z.string().optional().describe('Vendor order reference'),
    requestedDeliveryDate: z.string().optional().describe('Requested delivery date in ISO 8601 format'),
    currencyCode: z.string().optional().describe('Currency code. Example: "USD"'),
    paymentTermsName: z.string().optional().describe('Payment terms name'),
    deliveryTermsId: z.string().optional().describe('Delivery terms ID'),
    deliveryModeId: z.string().optional().describe('Delivery mode ID'),
    reasonCode: z.string().optional().describe('Reason code'),
    reasonComment: z.string().optional().describe('Reason comment'),
    attentionInformation: z.string().optional().describe('Attention information'),
    orderVendorAccountNumber: z.string().optional().describe('Order vendor account number'),
    invoiceVendorAccountNumber: z.string().optional().describe('Invoice vendor account number'),
    languageId: z.string().optional().describe('Language ID. Example: "en-US"'),
    purchaseOrderPoolId: z.string().optional().describe('Purchase order pool ID'),
    projectId: z.string().optional().describe('Project ID'),
    defaultReceivingSiteId: z.string().optional().describe('Default receiving site ID'),
    defaultReceivingWarehouseId: z.string().optional().describe('Default receiving warehouse ID'),
    additionalFields: z.record(z.string(), z.unknown()).optional()
});

const ProviderPurchaseOrderHeaderSchema = z
    .object({
        dataAreaId: z.string(),
        PurchaseOrderNumber: z.string(),
        PurchaseOrderName: z.string().optional(),
        VendorOrderReference: z.string().optional(),
        OrderVendorAccountNumber: z.string().optional(),
        InvoiceVendorAccountNumber: z.string().optional(),
        CurrencyCode: z.string().optional(),
        PaymentTermsName: z.string().optional(),
        DeliveryTermsId: z.string().optional(),
        DeliveryModeId: z.string().optional(),
        RequestedDeliveryDate: z.string().optional(),
        PurchaseOrderStatus: z.string().optional(),
        LanguageId: z.string().optional(),
        AccountingDate: z.string().optional(),
        ReasonCode: z.string().optional(),
        ReasonComment: z.string().optional(),
        AttentionInformation: z.string().optional(),
        ProjectId: z.string().optional(),
        PurchaseOrderPoolId: z.string().optional(),
        DefaultReceivingSiteId: z.string().optional(),
        DefaultReceivingWarehouseId: z.string().optional(),
        IsChangeManagementActive: z.string().optional(),
        DocumentApprovalStatus: z.string().optional(),
        ArePricesIncludingSalesTax: z.string().optional(),
        VendorPostingProfileId: z.string().optional(),
        TotalDiscountPercentage: z.number().optional(),
        CashDiscountPercentage: z.number().optional()
    })
    .passthrough();

const OutputSchema = ProviderPurchaseOrderHeaderSchema;

const action = createAction({
    description: 'Update a purchase order header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['openid', 'api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/data/PurchaseOrderHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId)}',PurchaseOrderNumber='${encodeURIComponent(input.purchaseOrderNumber)}')`;

        const patchBody: Record<string, unknown> = {};

        if (input.purchaseOrderName !== undefined) {
            patchBody['PurchaseOrderName'] = input.purchaseOrderName;
        }
        if (input.vendorOrderReference !== undefined) {
            patchBody['VendorOrderReference'] = input.vendorOrderReference;
        }
        if (input.requestedDeliveryDate !== undefined) {
            patchBody['RequestedDeliveryDate'] = input.requestedDeliveryDate;
        }
        if (input.currencyCode !== undefined) {
            patchBody['CurrencyCode'] = input.currencyCode;
        }
        if (input.paymentTermsName !== undefined) {
            patchBody['PaymentTermsName'] = input.paymentTermsName;
        }
        if (input.deliveryTermsId !== undefined) {
            patchBody['DeliveryTermsId'] = input.deliveryTermsId;
        }
        if (input.deliveryModeId !== undefined) {
            patchBody['DeliveryModeId'] = input.deliveryModeId;
        }
        if (input.reasonCode !== undefined) {
            patchBody['ReasonCode'] = input.reasonCode;
        }
        if (input.reasonComment !== undefined) {
            patchBody['ReasonComment'] = input.reasonComment;
        }
        if (input.attentionInformation !== undefined) {
            patchBody['AttentionInformation'] = input.attentionInformation;
        }
        if (input.orderVendorAccountNumber !== undefined) {
            patchBody['OrderVendorAccountNumber'] = input.orderVendorAccountNumber;
        }
        if (input.invoiceVendorAccountNumber !== undefined) {
            patchBody['InvoiceVendorAccountNumber'] = input.invoiceVendorAccountNumber;
        }
        if (input.languageId !== undefined) {
            patchBody['LanguageId'] = input.languageId;
        }
        if (input.purchaseOrderPoolId !== undefined) {
            patchBody['PurchaseOrderPoolId'] = input.purchaseOrderPoolId;
        }
        if (input.projectId !== undefined) {
            patchBody['ProjectId'] = input.projectId;
        }
        if (input.defaultReceivingSiteId !== undefined) {
            patchBody['DefaultReceivingSiteId'] = input.defaultReceivingSiteId;
        }
        if (input.defaultReceivingWarehouseId !== undefined) {
            patchBody['DefaultReceivingWarehouseId'] = input.defaultReceivingWarehouseId;
        }
        if (input.additionalFields !== undefined) {
            Object.assign(patchBody, input.additionalFields);
        }

        if (Object.keys(patchBody).length === 0) {
            throw new nango.ActionError({
                type: 'empty_update',
                message: 'No fields provided to update. Specify at least one field or additionalFields.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        await nango.patch({
            endpoint,
            data: patchBody,
            retries: 1
        });

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Purchase order not found after update',
                dataAreaId: input.dataAreaId,
                purchaseOrderNumber: input.purchaseOrderNumber
            });
        }

        const providerRecord = ProviderPurchaseOrderHeaderSchema.parse(response.data);

        return providerRecord;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
