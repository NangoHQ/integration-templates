import { z } from 'zod';
import { createAction } from 'nango';

const PaymentAccountSchema = z.object({
    id: z.string().describe('Unique identifier of the bank account. Example: "7bc1bb89-5ed5-48cd-a71c-9de9e383f745"'),
    account_name: z.string().describe('Display name of the bank account. Example: "Checking"'),
    account_number_last_four: z.string().describe('Last four digits of the account number. Example: "9752"'),
    currency: z.string().describe('ISO 4217 currency code of the bank account. Example: "USD"')
});

const ConnectedSubsidiarySchema = z.object({
    id: z.string().describe('ID that uniquely identifies the subsidiary within Ramp.'),
    name: z.string().describe('Name of the subsidiary in the connected ERP system.'),
    external_id: z.string().describe('External ID of the subsidiary in the connected ERP system.')
});

const ProviderAccountSchema = z.object({
    bank_account_id: z.string().nullable().optional().describe('Unique identifier of the associated bank account, if one exists.'),
    classification: z.string().describe('Classification type of the account. Example: "ASSET", "LIABILITY", "EXPENSE".'),
    created_at: z.string().describe('When the account was created. Example: "2020-01-12T01:30:00+00:00"'),
    external_id: z.string().describe('External ID of the account, sourced from the remote ERP system when connected.'),
    external_name: z.string().describe('External name of the account, sourced from the remote ERP system when connected.'),
    internal_id: z.string().describe('Internal ID of the account as entered in Ramp.'),
    usage_type: z.string().nullable().optional().describe('How the account is used within the system. Example: "BILL_PAY_BANK_ACCOUNT".')
});

const CustomRecordFieldSchema = z.object({
    column_id: z.string().describe('Identifier of the custom field column.'),
    column_display_name: z.string().describe('Display name of the custom field column. Example: "Entity Region"'),
    value: z.unknown().describe('Contents of the custom field cell; the shape varies by custom field type.')
});

const EntitySchema = z.object({
    id: z.string().describe('Unique identifier for the business entity. Example: "eb24fd81-de5d-43bd-8102-eb2cc53d3c3a"'),
    entity_name: z.string().describe('Name of the business entity. Example: "Save Time Inc"'),
    is_primary: z.boolean().nullable().optional().describe('Whether this is the primary entity for the business.'),
    currency: z.string().nullable().optional().describe('Currency used by this business entity. Example: "USD"'),
    location_ids: z.array(z.string()).describe('Identifiers of locations associated with this entity.'),
    default_bill_pay_payment_account_id: z
        .string()
        .nullable()
        .optional()
        .describe('Bank account UUID of the entity default Bill Pay payment account, if one is configured.'),
    connected_subsidiary: ConnectedSubsidiarySchema.nullable().optional().describe('The ERP subsidiary this entity is mapped to, if any.'),
    payment_accounts: z.array(PaymentAccountSchema).describe('Bank accounts eligible for bill payment for this entity.'),
    accounts: z.array(ProviderAccountSchema).describe('Active accounting accounts linked to this entity.'),
    custom_record_fields: z
        .array(CustomRecordFieldSchema)
        .optional()
        .describe('Custom record field values for this entity, returned only when include_custom_field_values is true.')
});

const PaginatedEntityResponseSchema = z.object({
    data: z.array(EntitySchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Pagination cursor: the ID of the last entity from the previous page. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of entities to return per page, between 2 and 100. Defaults to 20.'),
        entity_name: z.string().optional().describe('Filter entities by exact name. Example: "Save Money Inc"'),
        is_primary: z.boolean().optional().describe('When set, return only primary (true) or non-primary (false) entities.'),
        hide_inactive: z.boolean().optional().describe('When true, exclude inactive entities. Defaults to false.'),
        include_custom_field_values: z.boolean().optional().describe('When true, include custom record field values for each entity. Defaults to false.')
    })
    .describe('Filters and pagination options for listing the business entities.');

const OutputSchema = z
    .object({
        entities: z.array(EntitySchema).describe('Business entities/subsidiaries under the connected business.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as cursor to fetch the next page; omitted when there are no more results.')
    })
    .describe('A page of business entities/subsidiaries under the connected business.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of business entities/subsidiaries from the provider without modifying any data.
 * @pitfalls: next_cursor can be returned even when no further entities exist (a following page may be empty), so keep paging until a page returns none; inactive entities are included unless hide_inactive is true, and custom record field values are omitted unless include_custom_field_values is true.
 */
const action = createAction({
    description: 'List legal entities/subsidiaries under the business.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/entities)
        const response = await nango.get({
            endpoint: '/developer/v1/entities',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.entity_name !== undefined && { entity_name: input.entity_name }),
                ...(input.is_primary !== undefined && { is_primary: String(input.is_primary) }),
                ...(input.hide_inactive !== undefined && { hide_inactive: String(input.hide_inactive) }),
                ...(input.include_custom_field_values !== undefined && { include_custom_field_values: String(input.include_custom_field_values) })
            },
            retries: 3
        });

        const parsed = PaginatedEntityResponseSchema.parse(response.data);

        const lastEntity = parsed.data[parsed.data.length - 1];
        const nextCursor = parsed.page.next != null && lastEntity != null ? lastEntity.id : undefined;

        return {
            entities: parsed.data,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
