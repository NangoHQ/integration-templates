import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    fname: z.string().describe('First name. Example: "Alice"'),
    lname: z.string().describe('Last name. Example: "Nango"'),
    email: z.string().describe('Email address. Example: "alice@example.com"'),
    organization: z.string().optional().describe('Company or organization name. Example: "Builder LLC"'),
    phone: z.string().optional().describe('Phone number.'),
    p_street: z.string().optional().describe('Primary address street.'),
    p_city: z.string().optional().describe('Primary address city.'),
    p_province: z.string().optional().describe('Primary address province or state.'),
    p_country: z.string().optional().describe('Primary address country.'),
    p_code: z.string().optional().describe('Primary address postal code.')
});

const ProviderClientSchema = z.object({
    id: z.union([z.number(), z.string()]),
    fname: z.string().optional().nullable(),
    lname: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    organization: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    p_street: z.string().optional().nullable(),
    p_city: z.string().optional().nullable(),
    p_province: z.string().optional().nullable(),
    p_country: z.string().optional().nullable(),
    p_code: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe('Client ID. Example: "567521"'),
    fname: z.string().optional(),
    lname: z.string().optional(),
    email: z.string().optional(),
    organization: z.string().optional(),
    phone: z.string().optional(),
    p_street: z.string().optional(),
    p_city: z.string().optional(),
    p_province: z.string().optional(),
    p_country: z.string().optional(),
    p_code: z.string().optional()
});

const action = createAction({
    description: 'Create a client.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:clients:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata. Run get-account-id first.'
            });
        }

        // https://www.freshbooks.com/api/clients
        const response = await nango.post({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/users/clients`,
            data: {
                client: {
                    fname: input.fname,
                    lname: input.lname,
                    email: input.email,
                    ...(input.organization !== undefined && { organization: input.organization }),
                    ...(input.phone !== undefined && { phone: input.phone }),
                    ...(input.p_street !== undefined && { p_street: input.p_street }),
                    ...(input.p_city !== undefined && { p_city: input.p_city }),
                    ...(input.p_province !== undefined && { p_province: input.p_province }),
                    ...(input.p_country !== undefined && { p_country: input.p_country }),
                    ...(input.p_code !== undefined && { p_code: input.p_code })
                }
            },
            retries: 1
        });

        const raw = response.data;

        if (raw === null || raw === undefined || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from FreshBooks API.'
            });
        }

        const wrapperSchema = z.object({
            response: z.object({
                result: z.object({
                    client: ProviderClientSchema
                })
            })
        });

        const parsed = wrapperSchema.safeParse(raw);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from FreshBooks API.'
            });
        }

        const client = parsed.data.response.result.client;

        return {
            id: String(client.id),
            ...(client.fname != null && { fname: client.fname }),
            ...(client.lname != null && { lname: client.lname }),
            ...(client.email != null && { email: client.email }),
            ...(client.organization != null && { organization: client.organization }),
            ...(client.phone != null && { phone: client.phone }),
            ...(client.p_street != null && { p_street: client.p_street }),
            ...(client.p_city != null && { p_city: client.p_city }),
            ...(client.p_province != null && { p_province: client.p_province }),
            ...(client.p_country != null && { p_country: client.p_country }),
            ...(client.p_code != null && { p_code: client.p_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
