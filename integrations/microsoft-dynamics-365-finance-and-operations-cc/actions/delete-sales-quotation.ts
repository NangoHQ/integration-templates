import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    salesQuotationNumber: z.string().describe('Sales quotation number to delete. Example: "DAT-000005"')
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    salesQuotationNumber: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a draft sales quotation header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/SalesQuotationHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId)}',SalesQuotationNumber='${encodeURIComponent(input.salesQuotationNumber)}')`,
            retries: 1
        });

        return {
            dataAreaId: input.dataAreaId,
            salesQuotationNumber: input.salesQuotationNumber,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
