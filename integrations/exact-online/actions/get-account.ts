import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_id: z.string().describe('Account ID. Example: "a58c29d9-ef92-40f1-b817-31b36990898c"')
});

const MeResponseSchema = z.object({
    d: z
        .object({
            CurrentDivision: z.union([z.number(), z.string()]).optional(),
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.union([z.number(), z.string()]).optional()
                    })
                )
                .optional()
        })
        .optional()
});

const MeDirectResponseSchema = z.object({
    CurrentDivision: z.union([z.number(), z.string()]).optional()
});

const ProviderAccountSchema = z
    .object({
        ID: z.string(),
        Name: z.string().nullish(),
        Code: z.string().nullish(),
        Status: z.string().nullish(),
        IsSales: z.boolean().nullish(),
        IsPurchase: z.boolean().nullish(),
        Email: z.string().nullish(),
        Phone: z.string().nullish(),
        AddressLine1: z.string().nullish(),
        City: z.string().nullish(),
        Country: z.string().nullish(),
        Postcode: z.string().nullish(),
        Website: z.string().nullish(),
        VATNumber: z.string().nullish(),
        Modified: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    status: z.string().optional(),
    is_sales: z.boolean().optional(),
    is_purchase: z.boolean().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address_line1: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postcode: z.string().optional(),
    website: z.string().optional(),
    vat_number: z.string().optional(),
    modified: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single CRM account by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ExactOnline.API.Read'],
    endpoint: {
        path: '/actions/get-account',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.fr/docs/Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        let division: number | undefined;
        if (meData.d) {
            const rawDivision = meData.d.CurrentDivision ?? meData.d.results?.[0]?.CurrentDivision;
            if (rawDivision !== undefined) {
                division = typeof rawDivision === 'string' ? Number(rawDivision) : rawDivision;
            }
        }
        if (!division) {
            const directMe = MeDirectResponseSchema.safeParse(meResponse.data);
            if (directMe.success && directMe.data.CurrentDivision !== undefined) {
                division = typeof directMe.data.CurrentDivision === 'string' ? Number(directMe.data.CurrentDivision) : directMe.data.CurrentDivision;
            }
        }

        if (!division) {
            throw new nango.ActionError({
                type: 'division_not_found',
                message: 'Could not determine current division from Me endpoint.'
            });
        }

        // https://start.exactonline.fr/docs/Accounts
        const accountResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/crm/Accounts(guid'${encodeURIComponent(input.account_id)}')`,
            retries: 3
        });

        if (!accountResponse.data || !accountResponse.data.d) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found.',
                account_id: input.account_id
            });
        }

        const providerAccount = ProviderAccountSchema.parse(accountResponse.data.d);

        return {
            id: providerAccount.ID,
            ...(providerAccount.Name != null && { name: providerAccount.Name }),
            ...(providerAccount.Code != null && { code: providerAccount.Code }),
            ...(providerAccount.Status != null && { status: providerAccount.Status }),
            ...(providerAccount.IsSales != null && { is_sales: providerAccount.IsSales }),
            ...(providerAccount.IsPurchase != null && { is_purchase: providerAccount.IsPurchase }),
            ...(providerAccount.Email != null && { email: providerAccount.Email }),
            ...(providerAccount.Phone != null && { phone: providerAccount.Phone }),
            ...(providerAccount.AddressLine1 != null && { address_line1: providerAccount.AddressLine1 }),
            ...(providerAccount.City != null && { city: providerAccount.City }),
            ...(providerAccount.Country != null && { country: providerAccount.Country }),
            ...(providerAccount.Postcode != null && { postcode: providerAccount.Postcode }),
            ...(providerAccount.Website != null && { website: providerAccount.Website }),
            ...(providerAccount.VATNumber != null && { vat_number: providerAccount.VATNumber }),
            ...(providerAccount.Modified != null && { modified: providerAccount.Modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
