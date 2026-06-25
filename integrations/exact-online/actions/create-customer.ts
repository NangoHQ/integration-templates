import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Name: z.string().describe('Account name. Example: "Acme Corp"'),
    Status: z.enum(['C', 'S']).optional().describe('Account status: C=Customer, S=Supplier'),
    Email: z.string().optional().describe('Email address'),
    Phone: z.string().optional().describe('Phone number'),
    City: z.string().optional().describe('City'),
    Country: z.string().optional().describe('Country code'),
    VATNumber: z.string().optional().describe('VAT number')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const PostResponseSchema = z.object({
    d: z.object({
        ID: z.string().optional(),
        __metadata: z
            .object({
                uri: z.string()
            })
            .optional()
    })
});

const AccountResponseSchema = z.object({
    d: z.object({
        ID: z.string().optional(),
        Name: z.string().optional(),
        Status: z.string().optional(),
        Email: z.string().nullable().optional(),
        Phone: z.string().nullable().optional(),
        City: z.string().nullable().optional(),
        Country: z.string().nullable().optional(),
        VATNumber: z.string().nullable().optional(),
        IsSales: z.boolean().optional(),
        IsPurchase: z.boolean().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    vat_number: z.string().optional(),
    is_sales: z.boolean().optional(),
    is_purchase: z.boolean().optional()
});

function extractIdFromUri(uri: string): string | null {
    const match = uri.match(/'([^']+)'/);
    if (match && match[1] !== undefined) {
        return match[1];
    }
    return null;
}

const action = createAction({
    description: 'Create a new customer/account in Exact Online.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/create-customer'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=SystemMe
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const firstResult = meData.d.results[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        const division = firstResult.CurrentDivision;

        const body: Record<string, unknown> = {
            Name: input.Name
        };

        if (input.Status !== undefined) {
            body['Status'] = input.Status;
            body['IsSales'] = input.Status === 'C';
            body['IsPurchase'] = input.Status === 'S';
        }

        if (input.Email !== undefined) {
            body['Email'] = input.Email;
        }
        if (input.Phone !== undefined) {
            body['Phone'] = input.Phone;
        }
        if (input.City !== undefined) {
            body['City'] = input.City;
        }
        if (input.Country !== undefined) {
            body['Country'] = input.Country;
        }
        if (input.VATNumber !== undefined) {
            body['VATNumber'] = input.VATNumber;
        }

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=CRMAccounts
        const postResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Accounts`,
            data: body,
            retries: 1
        });

        const postData = PostResponseSchema.parse(postResponse.data);
        let id = postData.d.ID || null;

        if (!id && postData.d.__metadata) {
            id = extractIdFromUri(postData.d.__metadata.uri);
        }

        if (!id) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Could not extract account ID from POST response'
            });
        }

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=CRMAccounts
        const getResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Accounts(guid'${encodeURIComponent(id)}')`,
            retries: 3
        });

        const accountData = AccountResponseSchema.parse(getResponse.data);
        const account = accountData.d;

        return {
            id: id,
            ...(account.Name !== undefined && account.Name !== null && { name: account.Name }),
            ...(account.Status !== undefined && account.Status !== null && { status: account.Status }),
            ...(account.Email !== undefined && account.Email !== null && { email: account.Email }),
            ...(account.Phone !== undefined && account.Phone !== null && { phone: account.Phone }),
            ...(account.City !== undefined && account.City !== null && { city: account.City }),
            ...(account.Country !== undefined && account.Country !== null && { country: account.Country }),
            ...(account.VATNumber !== undefined && account.VATNumber !== null && { vat_number: account.VATNumber }),
            ...(account.IsSales !== undefined && account.IsSales !== null && { is_sales: account.IsSales }),
            ...(account.IsPurchase !== undefined && account.IsPurchase !== null && { is_purchase: account.IsPurchase })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
