import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Company ID. Example: "6a71ddac92e09607f906db63"'),
    name: z.string().optional().describe('Name of the Company'),
    account_type: z.string().optional().describe('Resource type. Example: "owner"'),
    address1: z.string().optional().describe("Line 1 in the Company's address"),
    address2: z.string().optional().describe("Line 2 in the Company's address"),
    city: z.string().optional().describe("City as indicated in the Company's address"),
    state: z.string().optional().describe("State as indicated in the Company's address"),
    zip: z.string().optional().describe("Zip/Postal Code as indicated in the Company's address"),
    country_code: z.string().optional().describe('Code of the country the Company is in'),
    phone: z.string().optional().describe('Company phone number'),
    email: z.string().optional().describe('Company email address'),
    website: z.string().optional().describe('Website of the Company'),
    custom_id: z.string().optional().describe('Custom ID of the Company'),
    office_locations: z.array(z.string()).optional().describe('An array of office location ids')
});

const ProviderCompanySchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    account_type: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    custom_id: z.string().nullable().optional(),
    office_locations: z.array(z.string()).optional(),
    is_archived: z.boolean().nullable().optional(),
    tags: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

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
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update fields on an existing company',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody: Record<string, unknown> = {};

        if (input.name !== undefined) {
            patchBody['name'] = input.name;
        }
        if (input.account_type !== undefined) {
            patchBody['account_type'] = input.account_type;
        }
        if (input.address1 !== undefined) {
            patchBody['address1'] = input.address1;
        }
        if (input.address2 !== undefined) {
            patchBody['address2'] = input.address2;
        }
        if (input.city !== undefined) {
            patchBody['city'] = input.city;
        }
        if (input.state !== undefined) {
            patchBody['state'] = input.state;
        }
        if (input.zip !== undefined) {
            patchBody['zip'] = input.zip;
        }
        if (input.country_code !== undefined) {
            patchBody['country_code'] = input.country_code;
        }
        if (input.phone !== undefined) {
            patchBody['phone'] = input.phone;
        }
        if (input.email !== undefined) {
            patchBody['email'] = input.email;
        }
        if (input.website !== undefined) {
            patchBody['website'] = input.website;
        }
        if (input.custom_id !== undefined) {
            patchBody['custom_id'] = input.custom_id;
        }
        if (input.office_locations !== undefined) {
            patchBody['office_locations'] = input.office_locations;
        }

        // https://api.ingenious.build/reference/75e3d4aa90492adc0640cce5c8697861.md
        await nango.patch({
            endpoint: `/api/v2/pub/companies/${encodeURIComponent(input.id)}`,
            data: patchBody,
            retries: 1
        });

        // https://api.ingenious.build/reference/getcompanypubv2.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/companies/${encodeURIComponent(input.id)}`,
            retries: 3
        });

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
            ...(providerCompany.tags != null && { tags: providerCompany.tags }),
            ...(providerCompany.created_at != null && { created_at: providerCompany.created_at }),
            ...(providerCompany.updated_at != null && { updated_at: providerCompany.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
