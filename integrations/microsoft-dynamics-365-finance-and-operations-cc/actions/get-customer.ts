import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    customerAccount: z.string().describe('Customer account number. Example: "DAT-000004"')
});

const ProviderCustomerSchema = z
    .object({
        dataAreaId: z.string(),
        CustomerAccount: z.string(),
        OrganizationName: z.string().nullable().optional(),
        CustomerGroupId: z.string().nullable().optional(),
        CurrencyCode: z.string().nullable().optional(),
        AddressCity: z.string().nullable().optional(),
        AddressCountryRegionId: z.string().nullable().optional(),
        SalesTaxGroup: z.string().nullable().optional(),
        PaymentTerms: z.string().nullable().optional(),
        Email: z.string().nullable().optional(),
        Phone: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProviderCustomerSchema;

const action = createAction({
    description: 'Retrieve a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/CustomersV3(dataAreaId='${encodeURIComponent(input.dataAreaId).replace(/'/g, "''")}',CustomerAccount='${encodeURIComponent(input.customerAccount).replace(/'/g, "''")}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer ${input.customerAccount} not found in company ${input.dataAreaId}.`
            });
        }

        const customer = ProviderCustomerSchema.parse(response.data);
        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
