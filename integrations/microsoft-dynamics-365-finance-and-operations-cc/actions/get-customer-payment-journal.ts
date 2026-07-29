import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    journalBatchNumber: z.string().describe('Journal batch number. Example: "DAT-000007"')
});

const ProviderResponseSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional(),
        Description: z.string().optional(),
        IsPosted: z.string().optional(),
        OverrideSalesTax: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional(),
        Description: z.string().optional(),
        IsPosted: z.string().optional(),
        OverrideSalesTax: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a customer payment journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/CustomerPaymentJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId)}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber)}')`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer payment journal not found.',
                dataAreaId: input.dataAreaId,
                journalBatchNumber: input.journalBatchNumber
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
