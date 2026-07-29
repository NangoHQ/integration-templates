import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    customerAccount: z.string().describe('Customer account number. Example: "DAT-000004"')
});

const ProviderCustomerSchema = z
    .object({
        dataAreaId: z.string().optional(),
        CustomerAccount: z.string().optional(),
        Name: z.string().nullable().optional(),
        NameAlias: z.string().nullable().optional(),
        CustomerGroupId: z.string().nullable().optional(),
        AddressCity: z.string().nullable().optional(),
        AddressCountryRegionId: z.string().nullable().optional(),
        AddressZipCode: z.string().nullable().optional(),
        AddressState: z.string().nullable().optional(),
        PrimaryContactEmail: z.string().nullable().optional(),
        PrimaryContactPhone: z.string().nullable().optional(),
        CurrencyCode: z.string().nullable().optional(),
        PaymentTerms: z.string().nullable().optional(),
        SalesTaxGroup: z.string().nullable().optional(),
        IsOneTimeCustomer: z.string().nullable().optional(),
        IsProspect: z.string().nullable().optional(),
        IsActiveCustomer: z.string().nullable().optional(),
        CreditLimit: z.number().nullable().optional(),
        PartyNumber: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProviderCustomerSchema;

const action = createAction({
    description: 'Retrieve a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { dataAreaId, customerAccount } = input;
        const encodedDataAreaId = encodeURIComponent(dataAreaId);
        const encodedCustomerAccount = encodeURIComponent(customerAccount);

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/CustomersV3(dataAreaId='${encodedDataAreaId}',CustomerAccount='${encodedCustomerAccount}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer '${customerAccount}' not found in company '${dataAreaId}'.`
            });
        }

        const customer = ProviderCustomerSchema.parse(response.data);
        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
