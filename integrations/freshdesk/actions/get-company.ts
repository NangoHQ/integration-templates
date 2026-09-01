import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Freshdesk company ID. Example: 8')
    })
    .describe('Input for retrieving a single Freshdesk company by ID.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the company.'),
        name: z.string().describe('Name of the company.'),
        description: z.string().optional().describe('Description of the company.'),
        domains: z.array(z.string()).describe('Domains associated with the company.'),
        note: z.string().optional().describe('Notes about the company.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields configured for the company.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format.'),
        health_score: z.string().optional().describe('Health score of the company.'),
        account_tier: z.string().optional().describe('Account tier of the company.'),
        renewal_date: z.string().optional().describe('Subscription renewal date in ISO 8601 format.'),
        industry: z.string().optional().describe('Industry the company belongs to.')
    })
    .describe('A single Freshdesk company returned by the API.');

const ProviderCompanySchema = z
    .object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable().optional(),
        domains: z.array(z.string()),
        note: z.string().nullable().optional(),
        custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        health_score: z.string().nullable().optional(),
        account_tier: z.string().nullable().optional(),
        renewal_date: z.string().nullable().optional(),
        industry: z.string().nullable().optional()
    })
    .passthrough();

/**
 * @tags: [read]
 * @tagReason: Retrieves a single company by ID from Freshdesk.
 */
const action = createAction({
    description: 'Retrieve a single company from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#view_company
        const response = await nango.get({
            endpoint: `/api/v2/companies/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found',
                id: input.id
            });
        }

        const raw = ProviderCompanySchema.parse(response.data);

        return {
            id: raw.id,
            name: raw.name,
            ...(raw.description != null && { description: raw.description }),
            domains: raw.domains,
            ...(raw.note != null && { note: raw.note }),
            ...(raw.custom_fields != null && { custom_fields: raw.custom_fields }),
            created_at: raw.created_at,
            updated_at: raw.updated_at,
            ...(raw.health_score != null && { health_score: raw.health_score }),
            ...(raw.account_tier != null && { account_tier: raw.account_tier }),
            ...(raw.renewal_date != null && { renewal_date: raw.renewal_date }),
            ...(raw.industry != null && { industry: raw.industry })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
