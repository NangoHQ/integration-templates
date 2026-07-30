import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe("Company / data area ID. Example: 'dat'"),
    invoiceIdentifier: z.string().describe("Invoice identifier (numeric). Example: '5637144588'")
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
        if (!/^\d+$/.test(input.invoiceIdentifier)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'invoiceIdentifier must contain only decimal digits.',
                invoiceIdentifier: input.invoiceIdentifier
            });
        }

        const encodedDataAreaId = encodeURIComponent(input.dataAreaId.replace(/'/g, "''"));

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        await nango.delete({
            endpoint: `/data/FreeTextInvoiceHeaders(dataAreaId='${encodedDataAreaId}',InvoiceIdentifier=${input.invoiceIdentifier})`,
            retries: 3
        });

        return {
            success: true,
            dataAreaId: input.dataAreaId,
            invoiceIdentifier: input.invoiceIdentifier
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
