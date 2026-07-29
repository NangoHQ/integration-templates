import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity code. Example: "dat"'),
    salesQuotationNumber: z.string().describe('Sales quotation number. Example: "DAT-000005"')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve a sales quotation header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: `/data/SalesQuotationHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId)}',SalesQuotationNumber='${encodeURIComponent(input.salesQuotationNumber)}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Sales quotation not found',
                dataAreaId: input.dataAreaId,
                salesQuotationNumber: input.salesQuotationNumber
            });
        }

        const providerData = OutputSchema.parse(response.data);
        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
