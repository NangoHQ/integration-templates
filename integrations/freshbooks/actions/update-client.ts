import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    id: z.string().describe('Client ID. Example: "567521"'),
    fname: z.string().optional().describe('First name'),
    lname: z.string().optional().describe('Last name'),
    organization: z.string().optional().describe('Organization name'),
    email: z.string().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    p_street: z.string().optional().describe('Primary street address'),
    p_city: z.string().optional().describe('Primary city'),
    p_province: z.string().optional().describe('Primary province or state'),
    p_code: z.string().optional().describe('Primary postal code'),
    p_country: z.string().optional().describe('Primary country'),
    note: z.string().optional().describe('Notes about the client'),
    vat_name: z.string().optional().describe('VAT name'),
    vat_number: z.string().optional().describe('VAT number')
});

const ProviderClientSchema = z.object({
    id: z.union([z.string(), z.number()]),
    userid: z.union([z.string(), z.number()]).optional().nullable(),
    fname: z.string().optional().nullable(),
    lname: z.string().optional().nullable(),
    organization: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    p_street: z.string().optional().nullable(),
    p_city: z.string().optional().nullable(),
    p_province: z.string().optional().nullable(),
    p_code: z.string().optional().nullable(),
    p_country: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    vat_name: z.string().optional().nullable(),
    vat_number: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    userid: z.string().optional(),
    fname: z.string().optional(),
    lname: z.string().optional(),
    organization: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    p_street: z.string().optional(),
    p_city: z.string().optional(),
    p_province: z.string().optional(),
    p_code: z.string().optional(),
    p_country: z.string().optional(),
    note: z.string().optional(),
    vat_name: z.string().optional(),
    vat_number: z.string().optional()
});

const FreshBooksResponseSchema = z.object({
    response: z.object({
        result: z.object({
            client: ProviderClientSchema
        })
    })
});

const action = createAction({
    description: 'Update a client',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:clients:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;
        const clientId = input.id;

        const clientBody: Record<string, unknown> = {};

        if (input.fname !== undefined) {
            clientBody['fname'] = input.fname;
        }
        if (input.lname !== undefined) {
            clientBody['lname'] = input.lname;
        }
        if (input.organization !== undefined) {
            clientBody['organization'] = input.organization;
        }
        if (input.email !== undefined) {
            clientBody['email'] = input.email;
        }
        if (input.phone !== undefined) {
            clientBody['phone'] = input.phone;
        }
        if (input.p_street !== undefined) {
            clientBody['p_street'] = input.p_street;
        }
        if (input.p_city !== undefined) {
            clientBody['p_city'] = input.p_city;
        }
        if (input.p_province !== undefined) {
            clientBody['p_province'] = input.p_province;
        }
        if (input.p_code !== undefined) {
            clientBody['p_code'] = input.p_code;
        }
        if (input.p_country !== undefined) {
            clientBody['p_country'] = input.p_country;
        }
        if (input.note !== undefined) {
            clientBody['note'] = input.note;
        }
        if (input.vat_name !== undefined) {
            clientBody['vat_name'] = input.vat_name;
        }
        if (input.vat_number !== undefined) {
            clientBody['vat_number'] = input.vat_number;
        }

        // https://www.freshbooks.com/api
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/users/clients/${encodeURIComponent(clientId)}`,
            data: {
                client: clientBody
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from FreshBooks API'
            });
        }

        const parsedResponse = FreshBooksResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse FreshBooks API response',
                details: parsedResponse.error.message
            });
        }

        const providerClient = parsedResponse.data.response.result.client;

        return {
            id: String(providerClient.id),
            ...(providerClient.userid != null && { userid: String(providerClient.userid) }),
            ...(providerClient.fname != null && { fname: providerClient.fname }),
            ...(providerClient.lname != null && { lname: providerClient.lname }),
            ...(providerClient.organization != null && { organization: providerClient.organization }),
            ...(providerClient.email != null && { email: providerClient.email }),
            ...(providerClient.phone != null && { phone: providerClient.phone }),
            ...(providerClient.p_street != null && { p_street: providerClient.p_street }),
            ...(providerClient.p_city != null && { p_city: providerClient.p_city }),
            ...(providerClient.p_province != null && { p_province: providerClient.p_province }),
            ...(providerClient.p_code != null && { p_code: providerClient.p_code }),
            ...(providerClient.p_country != null && { p_country: providerClient.p_country }),
            ...(providerClient.note != null && { note: providerClient.note }),
            ...(providerClient.vat_name != null && { vat_name: providerClient.vat_name }),
            ...(providerClient.vat_number != null && { vat_number: providerClient.vat_number })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
