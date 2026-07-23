import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    RequestingCustomerAccountNumber: z.string().describe('Customer account number. Example: "DAT-000004"'),
    CurrencyCode: z.string().describe('Currency code. Example: "USD"'),
    LanguageId: z.string().describe('Language identifier. Example: "en-us"'),
    SkipOpportunityCreationPrompt: z.string().optional().describe('Set to "Yes" to skip opportunity creation prompt. Defaults to "Yes".'),
    dataAreaId: z.string().optional().describe('Company / data area ID. Example: "dat"')
});

const OutputSchema = z
    .object({
        SalesQuotationNumber: z.string().optional(),
        RequestingCustomerAccountNumber: z.string().optional(),
        CurrencyCode: z.string().optional(),
        LanguageId: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a sales quotation header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['UserData.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, string> = {
            RequestingCustomerAccountNumber: input.RequestingCustomerAccountNumber,
            CurrencyCode: input.CurrencyCode,
            LanguageId: input.LanguageId,
            SkipOpportunityCreationPrompt: input.SkipOpportunityCreationPrompt ?? 'Yes',
            ...(input.dataAreaId !== undefined && { dataAreaId: input.dataAreaId })
        };

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationHeadersV2',
            data: body,
            retries: 1
        });

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an object response from the API.'
            });
        }

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
