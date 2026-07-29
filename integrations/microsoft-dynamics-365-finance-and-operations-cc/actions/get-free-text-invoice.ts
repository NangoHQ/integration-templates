import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area identifier. Example: "dat"'),
    invoiceIdentifier: z.number().describe('Numeric invoice identifier. Example: 5637144588')
});

const ProviderSchema = z
    .object({
        InvoiceIdentifier: z.number(),
        dataAreaId: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a free text invoice header',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProviderSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/FreeTextInvoiceHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId)}',InvoiceIdentifier=${input.invoiceIdentifier})`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Free text invoice header not found',
                dataAreaId: input.dataAreaId,
                invoiceIdentifier: input.invoiceIdentifier
            });
        }

        const providerInvoice = ProviderSchema.parse(response.data);

        return providerInvoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
