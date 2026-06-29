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
    pstreet: z.string().optional().describe('Primary address street.'),
    pcity: z.string().optional().describe('Primary address city.'),
    pprovince: z.string().optional().describe('Primary address province or state.'),
    pcountry: z.string().optional().describe('Primary address country.'),
    pcode: z.string().optional().describe('Primary address postal code.')
});

const ProviderClientSchema = z.object({
    id: z.union([z.number(), z.string()]),
    fname: z.string().optional().nullable(),
    lname: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    organization: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    pstreet: z.string().optional().nullable(),
    pcity: z.string().optional().nullable(),
    pprovince: z.string().optional().nullable(),
    pcountry: z.string().optional().nullable(),
    pcode: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe('Client ID. Example: "567521"'),
    fname: z.string().optional(),
    lname: z.string().optional(),
    email: z.string().optional(),
    organization: z.string().optional(),
    phone: z.string().optional(),
    pstreet: z.string().optional(),
    pcity: z.string().optional(),
    pprovince: z.string().optional(),
    pcountry: z.string().optional(),
    pcode: z.string().optional()
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
                    ...(input.pstreet !== undefined && { pstreet: input.pstreet }),
                    ...(input.pcity !== undefined && { pcity: input.pcity }),
                    ...(input.pprovince !== undefined && { pprovince: input.pprovince }),
                    ...(input.pcountry !== undefined && { pcountry: input.pcountry }),
                    ...(input.pcode !== undefined && { pcode: input.pcode })
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
            ...(client.pstreet != null && { pstreet: client.pstreet }),
            ...(client.pcity != null && { pcity: client.pcity }),
            ...(client.pprovince != null && { pprovince: client.pprovince }),
            ...(client.pcountry != null && { pcountry: client.pcountry }),
            ...(client.pcode != null && { pcode: client.pcode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
