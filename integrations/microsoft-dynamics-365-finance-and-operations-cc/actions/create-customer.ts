import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    OrganizationName: z.string(),
    CustomerGroupId: z.string(),
    SalesCurrencyCode: z.string(),
    dataAreaId: z.string().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    CustomerAccount: z.string(),
    OrganizationName: z.string(),
    CustomerGroupId: z.string(),
    SalesCurrencyCode: z.string(),
    PartyNumber: z.string().optional()
});

const action = createAction({
    description: 'Create a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const body: Record<string, unknown> = {
            OrganizationName: input.OrganizationName,
            CustomerGroupId: input.CustomerGroupId,
            SalesCurrencyCode: input.SalesCurrencyCode
        };

        if (input.dataAreaId) {
            body['dataAreaId'] = input.dataAreaId;
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.post({
            endpoint: '/data/CustomersV3',
            data: body,
            retries: 10
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({ message: 'Invalid response from provider: expected an object.' });
        }

        const parsed = OutputSchema.safeParse({
            dataAreaId: raw['dataAreaId'],
            CustomerAccount: raw['CustomerAccount'],
            OrganizationName: raw['OrganizationName'],
            CustomerGroupId: raw['CustomerGroupId'],
            SalesCurrencyCode: raw['SalesCurrencyCode'],
            // PartyNumber can come back as `null` from the provider for an unset value; omit it
            // rather than passing `null` into a schema that only declares `.optional()` (string |
            // undefined), which would otherwise fail parsing after the customer was already created.
            ...(raw['PartyNumber'] != null && { PartyNumber: raw['PartyNumber'] })
        });

        if (!parsed.success) {
            throw new nango.ActionError({ message: 'Provider response did not match expected output schema.', details: parsed.error.format() });
        }

        return parsed.data;
    }
});

export default action;
