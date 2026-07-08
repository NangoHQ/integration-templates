import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per page. Defaults to 20. Maximum 100.')
});

const AddressSchema = z
    .object({
        address: z.string().optional(),
        postal_code: z.string().optional(),
        city: z.string().optional(),
        country_alpha2: z.string().optional()
    })
    .passthrough();

const LedgerAccountSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const MandatesRefSchema = z
    .object({
        url: z.string()
    })
    .passthrough();

const BaseCustomerSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        billing_iban: z.string().nullable().optional(),
        payment_conditions: z.string().optional(),
        recipient: z.string().optional(),
        phone: z.string().optional(),
        reference: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        ledger_account: LedgerAccountSchema.nullable().optional(),
        emails: z.array(z.string()).optional(),
        billing_address: AddressSchema.nullable().optional(),
        delivery_address: AddressSchema.nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        customer_type: z.string(),
        external_reference: z.string().optional(),
        billing_language: z.string().optional(),
        mandates: MandatesRefSchema.optional(),
        pro_account_mandates: MandatesRefSchema.optional(),
        contacts: MandatesRefSchema.optional()
    })
    .passthrough();

const CompanyCustomerSchema = BaseCustomerSchema.extend({
    customer_type: z.literal('company'),
    vat_number: z.string().optional(),
    reg_no: z.string().optional()
});

const IndividualCustomerSchema = BaseCustomerSchema.extend({
    customer_type: z.literal('individual'),
    first_name: z.string().optional(),
    last_name: z.string().optional()
});

const CustomerSchema = z.union([CompanyCustomerSchema, IndividualCustomerSchema]);

const OutputSchema = z.object({
    items: z.array(CustomerSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List company and individual customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomers
            endpoint: '/api/external/v2/customers',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(z.unknown()),
                has_more: z.boolean(),
                next_cursor: z.string().nullable()
            })
            .parse(response.data);

        const customers = parsed.items.map((item) => CustomerSchema.parse(item));

        return {
            items: customers,
            has_more: parsed.has_more,
            ...(parsed.next_cursor !== null && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
