import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the company. Must be unique.'),
        description: z.string().optional().describe('Description of the company.'),
        domains: z
            .array(z.string())
            .optional()
            .describe('Domains of the company. Email addresses of contacts that contain this domain will be associated with that company automatically.'),
        note: z.string().optional().describe('Any specific note about the company.'),
        health_score: z.string().optional().describe('The strength of your relationship with the company.'),
        account_tier: z.string().optional().describe('Classification based on how much value the company brings to your business.'),
        renewal_date: z
            .string()
            .optional()
            .describe('Date when your contract or relationship with the company is due for renewal. Expected format: YYYY-MM-DD.'),
        industry: z.string().optional().describe('The industry the company serves in.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Key-value pairs containing the names and values of custom fields. Only dates in the format YYYY-MM-DD are accepted as input for custom date fields.'
            ),
        lookup_parameter: z
            .string()
            .optional()
            .describe(
                'Attribute for companies that can only be set if Custom Objects feature is enabled. The value can either be display_id or primary_field_value. Defaults to display_id.'
            )
    })
    .describe('Input for creating a company in Freshdesk.');

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    domains: z.array(z.string()),
    note: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    health_score: z.string().nullable().optional(),
    account_tier: z.string().nullable().optional(),
    renewal_date: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the company.'),
        name: z.string().describe('Name of the company.'),
        description: z.string().optional().describe('Description of the company.'),
        domains: z.array(z.string()).describe('Domains associated with the company.'),
        note: z.string().optional().describe('Any specific note about the company.'),
        created_at: z.string().describe('Company creation timestamp in UTC.'),
        updated_at: z.string().describe('Company updated timestamp in UTC.'),
        health_score: z.string().optional().describe('The strength of your relationship with the company.'),
        account_tier: z.string().optional().describe('Classification based on how much value the company brings to your business.'),
        renewal_date: z.string().optional().describe('Date when your contract or relationship with the company is due for renewal.'),
        industry: z.string().optional().describe('The industry the company serves in.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs containing the names and values of custom fields.')
    })
    .describe('Output representing a created company in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new company record in Freshdesk.
 * @pitfalls: Company names must be unique across the account; a duplicate name causes a 409 error rather than returning the existing company. Supplying domains automatically associates existing contacts whose emails contain those domains.
 */
const action = createAction({
    description: 'Create a company in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            name: input.name,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.domains !== undefined && { domains: input.domains }),
            ...(input.note !== undefined && { note: input.note }),
            ...(input.health_score !== undefined && { health_score: input.health_score }),
            ...(input.account_tier !== undefined && { account_tier: input.account_tier }),
            ...(input.renewal_date !== undefined && { renewal_date: input.renewal_date }),
            ...(input.industry !== undefined && { industry: input.industry }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.lookup_parameter !== undefined && { lookup_parameter: input.lookup_parameter })
        };

        // https://developers.freshdesk.com/api/#create_company
        const response = await nango.post({
            endpoint: '/api/v2/companies',
            data,
            retries: 10
        });

        const providerCompany = ProviderCompanySchema.parse(response.data);

        return {
            id: providerCompany.id,
            name: providerCompany.name,
            ...(providerCompany.description != null && { description: providerCompany.description }),
            domains: providerCompany.domains,
            ...(providerCompany.note != null && { note: providerCompany.note }),
            created_at: providerCompany.created_at,
            updated_at: providerCompany.updated_at,
            ...(providerCompany.health_score != null && { health_score: providerCompany.health_score }),
            ...(providerCompany.account_tier != null && { account_tier: providerCompany.account_tier }),
            ...(providerCompany.renewal_date != null && { renewal_date: providerCompany.renewal_date }),
            ...(providerCompany.industry != null && { industry: providerCompany.industry }),
            ...(providerCompany.custom_fields != null && { custom_fields: providerCompany.custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
