import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Account ID (GUID). Example: a58c29d9-ef92-40f1-b817-31b36990898c'),
    name: z.string().optional().describe('Account name'),
    addressLine1: z.string().optional().describe('First address line'),
    addressLine2: z.string().optional().describe('Second address line'),
    city: z.string().optional().describe('City'),
    country: z.string().optional().describe('ISO country code'),
    postcode: z.string().optional().describe('Postal code'),
    phone: z.string().optional().describe('Phone number'),
    email: z.string().optional().describe('Email address'),
    status: z.string().optional().describe('Account status: C=Customer, S=Supplier, A=Active/Both'),
    isSales: z.boolean().optional().describe('Is a sales relation'),
    isPurchase: z.boolean().optional().describe('Is a purchase relation'),
    vatNumber: z.string().optional().describe('VAT number')
});

const ProviderAccountSchema = z.object({
    ID: z.string(),
    Name: z.string().nullable().optional(),
    AddressLine1: z.string().nullable().optional(),
    AddressLine2: z.string().nullable().optional(),
    City: z.string().nullable().optional(),
    Country: z.string().nullable().optional(),
    Postcode: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Status: z.string().nullable().optional(),
    IsSales: z.boolean().nullable().optional(),
    IsPurchase: z.boolean().nullable().optional(),
    VATNumber: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postcode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    isSales: z.boolean().optional(),
    isPurchase: z.boolean().optional(),
    vatNumber: z.string().optional()
});

const action = createAction({
    description: 'Update an existing customer/account',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.accounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedId = encodeURIComponent(input.id);

        // https://support.exactonline.com/community/s/knowledge-base#All-All-EON-REST-GET-current-Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = z
            .object({
                d: z.object({
                    results: z.array(
                        z.object({
                            CurrentDivision: z.number()
                        })
                    )
                })
            })
            .parse(meResponse.data);

        const division = meData.d.results[0]?.CurrentDivision;
        if (!division) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from /api/v1/current/Me'
            });
        }

        const updateBody: Record<string, unknown> = {};
        if (input.name !== undefined) {
            updateBody['Name'] = input.name;
        }
        if (input.addressLine1 !== undefined) {
            updateBody['AddressLine1'] = input.addressLine1;
        }
        if (input.addressLine2 !== undefined) {
            updateBody['AddressLine2'] = input.addressLine2;
        }
        if (input.city !== undefined) {
            updateBody['City'] = input.city;
        }
        if (input.country !== undefined) {
            updateBody['Country'] = input.country;
        }
        if (input.postcode !== undefined) {
            updateBody['Postcode'] = input.postcode;
        }
        if (input.phone !== undefined) {
            updateBody['Phone'] = input.phone;
        }
        if (input.email !== undefined) {
            updateBody['Email'] = input.email;
        }
        if (input.status !== undefined) {
            updateBody['Status'] = input.status;
        }
        if (input.isSales !== undefined) {
            updateBody['IsSales'] = input.isSales;
        }
        if (input.isPurchase !== undefined) {
            updateBody['IsPurchase'] = input.isPurchase;
        }
        if (input.vatNumber !== undefined) {
            updateBody['VATNumber'] = input.vatNumber;
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-EON-REST-PUT-CRMAccounts
        const putResponse = await nango.put({
            endpoint: `/api/v1/${division}/crm/Accounts(guid'${encodedId}')`,
            data: updateBody,
            retries: 3
        });

        let providerData: z.infer<typeof ProviderAccountSchema>;
        if (putResponse.status === 204 || putResponse.status === 200) {
            if (putResponse.data && typeof putResponse.data === 'object' && Object.keys(putResponse.data).length > 0) {
                providerData = ProviderAccountSchema.parse(putResponse.data);
            } else {
                // https://support.exactonline.com/community/s/knowledge-base#All-All-EON-REST-GET-CRMAccounts
                const getResponse = await nango.get({
                    endpoint: `/api/v1/${division}/crm/Accounts(guid'${encodedId}')`,
                    retries: 3
                });
                const getData = z
                    .object({
                        d: ProviderAccountSchema
                    })
                    .parse(getResponse.data);
                providerData = getData.d;
            }
        } else {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Unexpected status from update: ${putResponse.status}`
            });
        }

        return {
            id: providerData.ID,
            ...(providerData.Name != null && { name: providerData.Name }),
            ...(providerData.AddressLine1 != null && { addressLine1: providerData.AddressLine1 }),
            ...(providerData.AddressLine2 != null && { addressLine2: providerData.AddressLine2 }),
            ...(providerData.City != null && { city: providerData.City }),
            ...(providerData.Country != null && { country: providerData.Country }),
            ...(providerData.Postcode != null && { postcode: providerData.Postcode }),
            ...(providerData.Phone != null && { phone: providerData.Phone }),
            ...(providerData.Email != null && { email: providerData.Email }),
            ...(providerData.Status != null && { status: providerData.Status }),
            ...(providerData.IsSales != null && { isSales: providerData.IsSales }),
            ...(providerData.IsPurchase != null && { isPurchase: providerData.IsPurchase }),
            ...(providerData.VATNumber != null && { vatNumber: providerData.VATNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
