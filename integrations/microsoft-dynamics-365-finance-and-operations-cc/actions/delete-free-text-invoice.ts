import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe("Company / legal entity code. Example: 'dat'"),
    invoiceIdentifier: z.string().describe('Free text invoice identifier. Example: "5637144588"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    dataAreaId: z.string(),
    invoiceIdentifier: z.string()
});

const action = createAction({
    description: 'Delete a draft (unposted) free text invoice header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/FreeTextInvoiceHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId)}',InvoiceIdentifier=${encodeURIComponent(input.invoiceIdentifier)})`,
            retries: 1
        };

        await nango.delete(config);

        return {
            success: true,
            dataAreaId: input.dataAreaId,
            invoiceIdentifier: input.invoiceIdentifier
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
