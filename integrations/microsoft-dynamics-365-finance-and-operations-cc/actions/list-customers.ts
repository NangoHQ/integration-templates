import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value). Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of customers to return. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('When true, query across all companies using cross-company=true.')
});

const ProviderCustomerSchema = z
    .object({
        dataAreaId: z.string().optional(),
        CustomerAccount: z.string().optional(),
        OrganizationName: z.string().nullable().optional(),
        NameAlias: z.string().nullable().optional(),
        PersonFirstName: z.string().nullable().optional(),
        PersonLastName: z.string().nullable().optional(),
        CustomerGroupId: z.string().optional(),
        SalesCurrencyCode: z.string().optional(),
        AddressCountryRegionId: z.string().optional(),
        PrimaryContactEmail: z.string().nullable().optional()
    })
    .passthrough();

const CustomerOutputSchema = z.object({
    data_area_id: z.string().optional(),
    customer_account: z.string().optional(),
    customer_name: z.string().optional(),
    customer_group_id: z.string().optional(),
    currency_code: z.string().optional(),
    country_region_id: z.string().optional(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CustomerOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'limit must be a positive integer.'
            });
        }

        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid numeric skip value.'
            });
        }

        const params: Record<string, string> = {
            $top: String(limit),
            $skip: String(skip)
        };

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomersV3',
            params: params,
            retries: 3
        });

        const responseData = z
            .object({
                value: z.array(z.unknown()).optional()
            })
            .passthrough()
            .safeParse(response.data);

        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse the provider response for customers.',
                details: responseData.error.message
            });
        }

        const rawItems: unknown[] = responseData.data.value ?? [];

        if (!Array.isArray(rawItems)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of customers from the provider.'
            });
        }

        const items = rawItems.map((item) => {
            const parsed = ProviderCustomerSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a customer record.',
                    details: parsed.error.message
                });
            }
            const customer = parsed.data;
            const customerName =
                customer.OrganizationName ??
                (customer.PersonFirstName || customer.PersonLastName ? [customer.PersonFirstName, customer.PersonLastName].filter(Boolean).join(' ') : null) ??
                customer.NameAlias ??
                null;
            const email = customer.PrimaryContactEmail ?? null;

            return {
                ...(customer.dataAreaId !== undefined && { data_area_id: customer.dataAreaId }),
                ...(customer.CustomerAccount !== undefined && { customer_account: customer.CustomerAccount }),
                ...(customerName != null && { customer_name: customerName }),
                ...(customer.CustomerGroupId !== undefined && { customer_group_id: customer.CustomerGroupId }),
                ...(customer.SalesCurrencyCode !== undefined && { currency_code: customer.SalesCurrencyCode }),
                ...(customer.AddressCountryRegionId !== undefined && { country_region_id: customer.AddressCountryRegionId }),
                ...(email != null && { email: email })
            };
        });

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items: items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
