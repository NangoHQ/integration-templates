import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/legal entity code. Example: "dat"'),
    requestingCustomerAccountNumber: z.string().describe('Customer account number. Example: "DAT-000004"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"'),
    languageId: z.string().describe('Language ID. Example: "en-us"'),
    skipOpportunityCreationPrompt: z
        .string()
        .default('Yes')
        .describe('Must be "Yes" to avoid interactive prompt when "Create opportunity for sales quotation" is set to Prompt. Example: "Yes"')
});

const ProviderResponseSchema = z
    .object({
        dataAreaId: z.string(),
        SalesQuotationNumber: z.string(),
        RequestingCustomerAccountNumber: z.string(),
        CurrencyCode: z.string(),
        LanguageId: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string(),
    quotationNumber: z.string(),
    requestingCustomerAccountNumber: z.string(),
    currencyCode: z.string(),
    languageId: z.string()
});

const action = createAction({
    description: 'Create a sales quotation header',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.post({
            endpoint: '/data/SalesQuotationHeadersV2',
            data: {
                dataAreaId: input.dataAreaId,
                RequestingCustomerAccountNumber: input.requestingCustomerAccountNumber,
                CurrencyCode: input.currencyCode,
                LanguageId: input.languageId,
                SkipOpportunityCreationPrompt: input.skipOpportunityCreationPrompt
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            dataAreaId: providerResponse.dataAreaId,
            quotationNumber: providerResponse.SalesQuotationNumber,
            requestingCustomerAccountNumber: providerResponse.RequestingCustomerAccountNumber,
            currencyCode: providerResponse.CurrencyCode,
            languageId: providerResponse.LanguageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
