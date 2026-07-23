import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code (data area ID). Example: "dat"'),
    salesQuotationNumber: z.string().describe('Sales quotation number. Example: "DAT-000005"')
});

const ProviderSalesQuotationSchema = z
    .object({
        dataAreaId: z.string().optional(),
        SalesQuotationNumber: z.string().optional(),
        SalesQuotationName: z.string().nullable().optional(),
        CustomerAccount: z.string().nullable().optional(),
        QuotationStatus: z.string().nullable().optional(),
        IsPosted: z.string().nullable().optional(),
        SkipOpportunityCreationPrompt: z.string().nullable().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    value: z.array(ProviderSalesQuotationSchema)
});

const action = createAction({
    description: 'Retrieve a sales quotation header.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderSalesQuotationSchema,
    scopes: ['OData.Full'],

    exec: async (nango, input) => {
        const encodedDataAreaId = encodeURIComponent(input.dataAreaId).replace(/'/g, "''");
        const encodedQuotationNumber = encodeURIComponent(input.salesQuotationNumber).replace(/'/g, "''");

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: `/data/SalesQuotationHeadersV2?$top=1&$filter=dataAreaId eq '${encodedDataAreaId}' and SalesQuotationNumber eq '${encodedQuotationNumber}'`,
            retries: 3
        });

        const list = ListResponseSchema.parse(response.data);
        const quotation = list.value[0];

        if (!quotation) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Sales quotation not found',
                dataAreaId: input.dataAreaId,
                salesQuotationNumber: input.salesQuotationNumber
            });
        }

        return quotation;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
