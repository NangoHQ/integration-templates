import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    salesOrderNumber: z.string().describe('Sales order number to update. Example: "DAT-000001"'),
    customerAccount: z.string().optional().describe('Customer account to associate with the sales order.'),
    requestedReceiptDate: z.string().optional().describe('Requested receipt date (ISO 8601).'),
    salesOrderName: z.string().optional().describe('Sales order name / description.'),
    currencyCode: z.string().optional().describe('Currency code. Example: "USD"'),
    deliveryAddressDescription: z.string().optional().describe('Delivery address description.')
});

const OutputSchema = z
    .object({
        dataAreaId: z.string().optional(),
        SalesOrderNumber: z.string().optional(),
        CustomerAccount: z.string().optional(),
        RequestedReceiptDate: z.string().optional(),
        SalesOrderName: z.string().optional(),
        CurrencyCode: z.string().optional(),
        DeliveryAddressDescription: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a sales order header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody: Record<string, unknown> = {
            ...(input.customerAccount !== undefined && { CustomerAccount: input.customerAccount }),
            ...(input.requestedReceiptDate !== undefined && { RequestedReceiptDate: input.requestedReceiptDate }),
            ...(input.salesOrderName !== undefined && { SalesOrderName: input.salesOrderName }),
            ...(input.currencyCode !== undefined && { CurrencyCode: input.currencyCode }),
            ...(input.deliveryAddressDescription !== undefined && { DeliveryAddressDescription: input.deliveryAddressDescription })
        };

        if (Object.keys(patchBody).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        const encodedDataAreaId = encodeURIComponent(input.dataAreaId).replace(/'/g, "''");
        const encodedSalesOrderNumber = encodeURIComponent(input.salesOrderNumber).replace(/'/g, "''");

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        await nango.patch({
            endpoint: `/data/SalesOrderHeadersV2(dataAreaId='${encodedDataAreaId}',SalesOrderNumber='${encodedSalesOrderNumber}')`,
            data: patchBody,
            retries: 1
        });

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: `/data/SalesOrderHeadersV2(dataAreaId='${encodedDataAreaId}',SalesOrderNumber='${encodedSalesOrderNumber}')`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Sales order not found after update.'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
