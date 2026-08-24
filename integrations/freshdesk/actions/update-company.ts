import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the company to update. Example: 8'),
        name: z.string().optional().describe('Name of the company. Must be unique.'),
        description: z.string().optional().describe('Description of the company.'),
        domains: z.array(z.string()).optional().describe('Domains of the company. Pass an empty array to remove all existing domains.'),
        note: z.string().optional().describe('Any specific note about the company.'),
        health_score: z.string().optional().describe('The strength of your relationship with the company.'),
        account_tier: z.string().optional().describe('Classification based on how much value the company brings to your business.'),
        renewal_date: z.string().optional().describe('Date when your contract or relationship with the company is due for renewal. Format: YYYY-MM-DD.'),
        industry: z.string().optional().describe('The industry the company serves in.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Key-value pairs of custom field names and values. Only dates in YYYY-MM-DD format are accepted for custom date fields.'),
        lookup_parameter: z
            .string()
            .optional()
            .describe(
                'Format for custom object lookup values. Either "display_id" (record ID) or "primary_field_value" (user defined value). Defaults to "display_id". Only applicable if Custom Objects is enabled.'
            )
    })
    .describe('Input payload for updating a Freshdesk company.');

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    domains: z.array(z.string()).nullable().optional(),
    note: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    health_score: z.string().nullable().optional(),
    account_tier: z.string().nullable().optional(),
    renewal_date: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the company.'),
        name: z.string().describe('Name of the company.'),
        description: z.string().optional().describe('Description of the company.'),
        domains: z.array(z.string()).optional().describe('Domains associated with the company.'),
        note: z.string().optional().describe('Note about the company.'),
        created_at: z.string().optional().describe('Timestamp when the company was created. Format: ISO 8601.'),
        updated_at: z.string().optional().describe('Timestamp when the company was last updated. Format: ISO 8601.'),
        health_score: z.string().optional().describe('The strength of your relationship with the company.'),
        account_tier: z.string().optional().describe('Classification based on how much value the company brings to your business.'),
        renewal_date: z.string().optional().describe('Date when your contract or relationship with the company is due for renewal.'),
        industry: z.string().optional().describe('The industry the company serves in.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom field names and values.')
    })
    .describe('The updated Freshdesk company returned after a successful update.');

/**
 * @tags: [write]
 * @tagReason: Updates company properties in Freshdesk via PATCH.
 * @pitfalls: Passing `domains: []` permanently removes all existing company domains.
 */
const action = createAction({
    description: 'Update a company in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.domains !== undefined) {
            data['domains'] = input.domains;
        }
        if (input.note !== undefined) {
            data['note'] = input.note;
        }
        if (input.health_score !== undefined) {
            data['health_score'] = input.health_score;
        }
        if (input.account_tier !== undefined) {
            data['account_tier'] = input.account_tier;
        }
        if (input.renewal_date !== undefined) {
            data['renewal_date'] = input.renewal_date;
        }
        if (input.industry !== undefined) {
            data['industry'] = input.industry;
        }
        if (input.custom_fields !== undefined) {
            data['custom_fields'] = input.custom_fields;
        }
        if (input.lookup_parameter !== undefined) {
            data['lookup_parameter'] = input.lookup_parameter;
        }

        const response = await nango.patch({
            // https://developers.freshdesk.com/api/#update_company
            endpoint: `/api/v2/companies/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 3
        });

        const providerCompany = ProviderCompanySchema.parse(response.data);

        return {
            id: providerCompany.id,
            name: providerCompany.name,
            ...(providerCompany.description != null && { description: providerCompany.description }),
            ...(providerCompany.domains != null && { domains: providerCompany.domains }),
            ...(providerCompany.note != null && { note: providerCompany.note }),
            ...(providerCompany.created_at != null && { created_at: providerCompany.created_at }),
            ...(providerCompany.updated_at != null && { updated_at: providerCompany.updated_at }),
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
