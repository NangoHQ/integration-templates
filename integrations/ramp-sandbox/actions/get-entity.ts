import { z } from 'zod';
import { createAction } from 'nango';

const ConnectedSubsidiarySchema = z.object({
    external_id: z.string().describe('External ID of the subsidiary in the ERP system.'),
    id: z.string().describe('ID that uniquely identifies the subsidiary within Ramp.'),
    name: z.string().describe('Name of the subsidiary in the ERP system.')
});

const EntityAccountSchema = z.object({
    bank_account_id: z.string().nullable().describe('Unique identifier of the associated bank account, or null when none exists.'),
    classification: z.string().describe('Classification type of the account (e.g. ASSET, LIABILITY, REVENUE).'),
    created_at: z.string().describe('When the account was created (ISO 8601 date-time).'),
    external_id: z.string().describe('External ID of the account, sourced from the remote ERP system when directly integrated.'),
    external_name: z.string().describe('External name of the account, sourced from the remote ERP system when directly integrated.'),
    internal_id: z.string().describe('Internal account ID assigned by the accounting provider.'),
    usage_type: z.string().nullable().describe('How the account is used within the system (e.g. BILL_PAY_BANK_ACCOUNT), or null when unset.')
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
        currency: z.string().nullable().describe('Currency used by the business entity, or null when not set.'),
        is_primary: z.boolean().nullable().describe('Whether this is the primary entity for the business, or null when unknown.'),
        connected_subsidiary: ConnectedSubsidiarySchema.nullable().describe(
            'The ERP subsidiary this entity is mapped to, or null when the entity is not mapped.'
        ),
        default_bill_pay_payment_account_id: z
            .string()
            .nullable()
            .describe('Bank account UUID configured as the default Bill Pay payment account, or null when none is configured.'),
        location_ids: z.array(z.string()).describe('Identifiers of locations associated with the entity.'),
        accounts: z.array(EntityAccountSchema).describe("Information about the entity's active accounts."),
        payment_accounts: z.array(PaymentAccountSchema).describe('Bank accounts eligible for bill payment for this entity.')
    })
    .describe('A single business entity and its associated accounts, locations, and subsidiary mapping.');

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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
