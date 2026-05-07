import { z } from 'zod';
import { createAction } from 'nango';

const CompanyIdSchema = z
    .object({
        id: z.string().optional().describe('Company ID'),
        company_id: z.string().optional().describe('Company ID alternative field')
    })
    .refine((data) => data.id || data.company_id, {
        message: 'Each company entry must have at least one of: id, company_id'
    });

const InputSchema = z.object({
    name: z.string().describe('Tag name to apply. Example: "VIP"'),
    companies: z.array(CompanyIdSchema).min(1).describe('Array of companies to tag with their IDs')
});

const ProviderCompanySchema = z.object({
    id: z.string().optional(),
    company_id: z.string().optional(),
    name: z.string().optional()
});

const ProviderTagSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    companies: z.array(ProviderCompanySchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    companies: z
        .array(
            z.object({
                id: z.string().optional(),
                company_id: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Apply a tag to one or more companies',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/tag-companies',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name,
            companies: input.companies.map((company) => ({
                ...(company.id !== undefined && { id: company.id }),
                ...(company.company_id !== undefined && { company_id: company.company_id })
            }))
        };

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
        const response = await nango.post({
            endpoint: '/tags',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: requestBody,
            retries: 3
        });

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            type: providerTag.type,
            ...(providerTag.companies !== undefined && {
                companies: providerTag.companies.map((company) => ({
                    ...(company.id !== undefined && { id: company.id }),
                    ...(company.company_id !== undefined && { company_id: company.company_id }),
                    ...(company.name !== undefined && { name: company.name })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
