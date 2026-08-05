import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.string().describe('Company ID. Example: "6a6b8337374668eea203ccb7"')
});

const ProviderCompanySchema = z
    .object({
        id: z.string(),
        name: z.string().optional().nullable(),
        account_type: z.string().optional().nullable(),
        address1: z.string().optional().nullable(),
        address2: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        zip: z.string().optional().nullable(),
        country_code: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
        custom_id: z.string().optional().nullable(),
        office_locations: z.array(z.string()).optional().nullable(),
        is_archived: z.boolean().optional().nullable(),
        tags: z
            .array(
                z.object({
                    id: z.string().optional().nullable(),
                    name: z.string().optional().nullable()
                })
            )
            .optional()
            .nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_type: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country_code: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    custom_id: z.string().optional(),
    office_locations: z.array(z.string()).optional(),
    is_archived: z.boolean().optional(),
    tags: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Get a single company by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.ingenious.build/reference/getcompanypubv2
        const response = await nango.get({
            endpoint: `/api/v2/pub/companies/${encodeURIComponent(input.company_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found',
                company_id: input.company_id
            });
        }

        const providerCompany = ProviderCompanySchema.parse(response.data);

        return {
            id: providerCompany.id,
            ...(providerCompany.name != null && { name: providerCompany.name }),
            ...(providerCompany.account_type != null && { account_type: providerCompany.account_type }),
            ...(providerCompany.address1 != null && { address1: providerCompany.address1 }),
            ...(providerCompany.address2 != null && { address2: providerCompany.address2 }),
            ...(providerCompany.city != null && { city: providerCompany.city }),
            ...(providerCompany.state != null && { state: providerCompany.state }),
            ...(providerCompany.zip != null && { zip: providerCompany.zip }),
            ...(providerCompany.country_code != null && { country_code: providerCompany.country_code }),
            ...(providerCompany.phone != null && { phone: providerCompany.phone }),
            ...(providerCompany.email != null && { email: providerCompany.email }),
            ...(providerCompany.website != null && { website: providerCompany.website }),
            ...(providerCompany.custom_id != null && { custom_id: providerCompany.custom_id }),
            ...(providerCompany.office_locations != null && { office_locations: providerCompany.office_locations }),
            ...(providerCompany.is_archived != null && { is_archived: providerCompany.is_archived }),
            ...(providerCompany.tags != null && {
                tags: providerCompany.tags.map((tag) => ({
                    ...(tag.id != null && { id: tag.id }),
                    ...(tag.name != null && { name: tag.name })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
