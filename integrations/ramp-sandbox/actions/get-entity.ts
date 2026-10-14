import { z } from 'zod';
import { createAction } from 'nango';

const ConnectedSubsidiarySchema = z.object({
    external_id: z.string().describe('External ID of the subsidiary in the ERP system.'),
    id: z.string().describe('ID that uniquely identifies the subsidiary within Ramp.'),
    name: z.string().describe('Name of the subsidiary in the ERP system.')
});

const EntityAccountSchema = z.object({
    bank_account_id: z.string().optional().describe('Unique identifier of the associated bank account. Absent when none exists.'),
    classification: z.string().describe('Classification type of the account (e.g. ASSET, LIABILITY, REVENUE).'),
    created_at: z.string().describe('When the account was created (ISO 8601 date-time).'),
    external_id: z.string().describe('External ID of the account, sourced from the remote ERP system when directly integrated.'),
    external_name: z.string().describe('External name of the account, sourced from the remote ERP system when directly integrated.'),
    internal_id: z.string().describe('Internal account ID assigned by the accounting provider.'),
    usage_type: z.string().optional().describe('How the account is used within the system (e.g. BILL_PAY_BANK_ACCOUNT). Absent when unset.')
});

const PaymentAccountSchema = z.object({
    account_name: z.string().describe('Display name of the bank account.'),
    account_number_last_four: z.string().describe('Last four digits of the account number.'),
    currency: z.string().describe('ISO 4217 currency code of the bank account (e.g. USD, CAD).'),
    id: z.string().describe('Unique identifier of the bank account.')
});

const InputSchema = z
    .object({
        entity_id: z.string().describe('Unique identifier of the business entity to retrieve. Example: "d290f1ee-6c54-4b01-90e6-d701748f0851"')
    })
    .describe('Input for retrieving a single business entity by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the business entity.'),
        entity_name: z.string().describe('Name of the business entity.'),
        currency: z.string().optional().describe('Currency used by the business entity. Absent when not set.'),
        is_primary: z.boolean().optional().describe('Whether this is the primary entity for the business. Absent when unknown.'),
        connected_subsidiary: ConnectedSubsidiarySchema.optional().describe(
            'The ERP subsidiary this entity is mapped to. Absent when the entity is not mapped.'
        ),
        default_bill_pay_payment_account_id: z
            .string()
            .optional()
            .describe('Bank account UUID configured as the default Bill Pay payment account. Absent when none is configured.'),
        location_ids: z.array(z.string()).describe('Identifiers of locations associated with the entity.'),
        accounts: z.array(EntityAccountSchema).describe("Information about the entity's active accounts."),
        payment_accounts: z.array(PaymentAccountSchema).describe('Bank accounts eligible for bill payment for this entity.')
    })
    .describe('A single business entity and its associated accounts, locations, and subsidiary mapping.');

const ProviderEntityAccountSchema = z.object({
    bank_account_id: z.string().nullable(),
    classification: z.string(),
    created_at: z.string(),
    external_id: z.string(),
    external_name: z.string(),
    internal_id: z.string(),
    usage_type: z.string().nullable()
});

const ProviderEntitySchema = z.object({
    id: z.string(),
    entity_name: z.string(),
    currency: z.string().nullable(),
    is_primary: z.boolean().nullable(),
    connected_subsidiary: ConnectedSubsidiarySchema.nullable(),
    default_bill_pay_payment_account_id: z.string().nullable(),
    location_ids: z.array(z.string()),
    accounts: z.array(ProviderEntityAccountSchema),
    payment_accounts: z.array(PaymentAccountSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single business entity by ID from the provider without modifying any provider state.
 * @pitfalls: accounts and payment_accounts are independent lists, so accounts can be empty even when payment_accounts is populated.
 */
const action = createAction({
    description: 'Retrieve a single business entity by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/entities/{entity_id})
            endpoint: `/developer/v1/entities/${encodeURIComponent(input.entity_id)}`,
            retries: 3
        });

        const entity = ProviderEntitySchema.parse(response.data);

        return {
            id: entity.id,
            entity_name: entity.entity_name,
            ...(entity.currency != null && { currency: entity.currency }),
            ...(entity.is_primary != null && { is_primary: entity.is_primary }),
            ...(entity.connected_subsidiary != null && { connected_subsidiary: entity.connected_subsidiary }),
            ...(entity.default_bill_pay_payment_account_id != null && { default_bill_pay_payment_account_id: entity.default_bill_pay_payment_account_id }),
            location_ids: entity.location_ids,
            accounts: entity.accounts.map((account) => ({
                classification: account.classification,
                created_at: account.created_at,
                external_id: account.external_id,
                external_name: account.external_name,
                internal_id: account.internal_id,
                ...(account.bank_account_id != null && { bank_account_id: account.bank_account_id }),
                ...(account.usage_type != null && { usage_type: account.usage_type })
            })),
            payment_accounts: entity.payment_accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
