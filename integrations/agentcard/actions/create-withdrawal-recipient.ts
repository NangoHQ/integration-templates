import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "usr_123"'),
    type: z.enum(['ach', 'international_wire']).describe("The recipient type. Either 'ach' or 'international_wire'."),
    beneficiary_name: z.string().describe("The account holder's legal name."),
    country_code: z.string().describe('ISO 3166-1 alpha-2 country of the bank account. Example: "US"'),
    nickname: z.string().optional().describe('Optional nickname for this recipient.'),
    email: z.string().optional().describe('Optional email address.'),
    routing_number: z.string().optional().describe('ACH: 9-digit ABA routing number.'),
    account_number: z.string().optional().describe('ACH: the account number.'),
    account_type: z.enum(['checking', 'savings']).optional().describe("ACH only. Either 'checking' or 'savings'."),
    iban: z.string().optional().describe('International wire: the IBAN (spaces ok, normalized on save).'),
    swift_code: z.string().optional().describe('International wire: the SWIFT/BIC.'),
    bank_name: z.string().optional().describe('Optional bank name.'),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postal_code: z.string().optional(),
    country_specific: z
        .object({})
        .passthrough()
        .optional()
        .describe('Country-specific banking fields, e.g. {"ifsc": "..."} for India or {"clabe": "..."} for Mexico.')
});

const ProviderRecipientSchema = z.object({
    object: z.enum(['withdrawal_recipient']),
    user_id: z.string(),
    id: z.string(),
    type: z.enum(['ach', 'international_wire']),
    nickname: z.string().nullable(),
    beneficiary_name: z.string(),
    country_code: z.string(),
    currency: z.string().nullable(),
    bank_name: z.string().nullable(),
    account_number_last4: z.string().nullable(),
    routing_number: z.string().nullable(),
    account_type: z.enum(['checking', 'savings']).nullable(),
    iban_last4: z.string().nullable(),
    swift_code: z.string().nullable(),
    created_at: z.string()
});

const OutputSchema = z.object({
    object: z.enum(['withdrawal_recipient']),
    user_id: z.string(),
    id: z.string(),
    type: z.enum(['ach', 'international_wire']),
    nickname: z.string().optional(),
    beneficiary_name: z.string(),
    country_code: z.string(),
    currency: z.string().optional(),
    bank_name: z.string().optional(),
    account_number_last4: z.string().optional(),
    routing_number: z.string().optional(),
    account_type: z.enum(['checking', 'savings']).optional(),
    iban_last4: z.string().optional(),
    swift_code: z.string().optional(),
    created_at: z.string()
});

const action = createAction({
    description: 'Save a bank account a connected user can withdraw funds to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.type === 'ach') {
            if (!input.routing_number || !input.account_number || !input.account_type) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'ACH recipients require routing_number, account_number, and account_type.'
                });
            }
        } else {
            if (!input.iban || !input.swift_code) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'International wire recipients require iban and swift_code.'
                });
            }
        }

        const requestBody: { [key: string]: unknown } = {
            user_id: input.user_id,
            type: input.type,
            beneficiary_name: input.beneficiary_name,
            country_code: input.country_code,
            ...(input.nickname !== undefined && { nickname: input.nickname }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.bank_name !== undefined && { bank_name: input.bank_name }),
            ...(input.address_line1 !== undefined && { address_line1: input.address_line1 }),
            ...(input.address_line2 !== undefined && { address_line2: input.address_line2 }),
            ...(input.city !== undefined && { city: input.city }),
            ...(input.region !== undefined && { region: input.region }),
            ...(input.postal_code !== undefined && { postal_code: input.postal_code }),
            ...(input.country_specific !== undefined && { country_specific: input.country_specific })
        };

        if (input.type === 'ach') {
            requestBody['routing_number'] = input.routing_number;
            requestBody['account_number'] = input.account_number;
            requestBody['account_type'] = input.account_type;
        } else {
            requestBody['iban'] = input.iban;
            requestBody['swift_code'] = input.swift_code;
        }

        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/wallet-withdrawal-recipient-create
            endpoint: '/api/v2/wallet/withdrawal-recipients',
            data: requestBody,
            retries: 3
        });

        const recipient = ProviderRecipientSchema.parse(response.data);

        return {
            object: recipient.object,
            user_id: recipient.user_id,
            id: recipient.id,
            type: recipient.type,
            beneficiary_name: recipient.beneficiary_name,
            country_code: recipient.country_code,
            created_at: recipient.created_at,
            ...(recipient.nickname != null && { nickname: recipient.nickname }),
            ...(recipient.currency != null && { currency: recipient.currency }),
            ...(recipient.bank_name != null && { bank_name: recipient.bank_name }),
            ...(recipient.account_number_last4 != null && { account_number_last4: recipient.account_number_last4 }),
            ...(recipient.routing_number != null && { routing_number: recipient.routing_number }),
            ...(recipient.account_type != null && { account_type: recipient.account_type }),
            ...(recipient.iban_last4 != null && { iban_last4: recipient.iban_last4 }),
            ...(recipient.swift_code != null && { swift_code: recipient.swift_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
