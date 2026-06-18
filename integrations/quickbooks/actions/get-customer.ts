import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Customer ID. Example: "1"')
});

const ProviderCustomerSchema = z.object({
    Id: z.string(),
    DisplayName: z.string().optional(),
    GivenName: z.string().optional(),
    FamilyName: z.string().optional(),
    CompanyName: z.string().optional(),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    Active: z.boolean().optional(),
    Balance: z.number().optional(),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional(),
            Country: z.string().optional()
        })
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    Customer: ProviderCustomerSchema
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    companyName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    active: z.boolean().optional(),
    balance: z.number().optional(),
    address: z
        .object({
            line1: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'Retrieve a customer by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
        const response = await nango.get({
            endpoint: `/v3/company/${realmId}/customer/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer with ID ${input.id} not found`
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const customer = providerResponse.Customer;

        return {
            id: customer.Id,
            ...(customer.DisplayName !== undefined && { displayName: customer.DisplayName }),
            ...(customer.GivenName !== undefined && { givenName: customer.GivenName }),
            ...(customer.FamilyName !== undefined && { familyName: customer.FamilyName }),
            ...(customer.CompanyName !== undefined && { companyName: customer.CompanyName }),
            ...(customer.PrimaryEmailAddr?.Address !== undefined && {
                email: customer.PrimaryEmailAddr.Address
            }),
            ...(customer.PrimaryPhone?.FreeFormNumber !== undefined && {
                phone: customer.PrimaryPhone.FreeFormNumber
            }),
            ...(customer.Active !== undefined && { active: customer.Active }),
            ...(customer.Balance !== undefined && { balance: customer.Balance }),
            ...(customer.BillAddr !== undefined && {
                address: {
                    ...(customer.BillAddr.Line1 !== undefined && { line1: customer.BillAddr.Line1 }),
                    ...(customer.BillAddr.City !== undefined && { city: customer.BillAddr.City }),
                    ...(customer.BillAddr.CountrySubDivisionCode !== undefined && {
                        state: customer.BillAddr.CountrySubDivisionCode
                    }),
                    ...(customer.BillAddr.PostalCode !== undefined && {
                        postalCode: customer.BillAddr.PostalCode
                    }),
                    ...(customer.BillAddr.Country !== undefined && { country: customer.BillAddr.Country })
                }
            }),
            ...(customer.MetaData?.CreateTime !== undefined && { createdAt: customer.MetaData.CreateTime }),
            ...(customer.MetaData?.LastUpdatedTime !== undefined && {
                updatedAt: customer.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
