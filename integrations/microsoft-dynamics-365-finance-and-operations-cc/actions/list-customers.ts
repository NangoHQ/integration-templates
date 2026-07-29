import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of records to return. Defaults to 100.'),
    crossCompany: z.boolean().optional().describe('If true, query across all companies. Defaults to false (scoped to the connection default company).')
});

const ProviderCustomerSchema = z
    .object({
        CustomerAccount: z.string(),
        Name: z.string().optional(),
        NameAlias: z.string().optional(),
        CustomerGroupId: z.string().optional(),
        PaymentTerms: z.string().optional(),
        SalesTaxGroup: z.string().optional(),
        CurrencyCode: z.string().optional(),
        Email: z.string().optional(),
        Phone: z.string().optional(),
        AddressCity: z.string().optional(),
        AddressCountryRegionId: z.string().optional(),
        AddressState: z.string().optional(),
        AddressZipCode: z.string().optional(),
        AddressStreet: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    customers: z.array(ProviderCustomerSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['DataEntities.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = Math.min(Math.max(input.limit ?? 100, 1), 10000);
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid numeric string'
            });
        }

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (input.crossCompany) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomersV3',
            params,
            retries: 3
        });

        const responseSchema = z.object({
            value: z.array(z.unknown())
        });

        const parsedResponse = responseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected response with a value array'
            });
        }

        const customers = parsedResponse.data.value.map((item: unknown) => {
            const parsed = ProviderCustomerSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'schema_validation_failed',
                    message: `Customer schema validation failed: ${parsed.error.message}`
                });
            }
            return parsed.data;
        });

        const nextCursor = customers.length === limit ? String(skip + limit) : undefined;

        return {
            customers,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
