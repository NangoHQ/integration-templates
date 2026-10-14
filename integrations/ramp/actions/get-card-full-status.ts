import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string().optional(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const SpendingRestrictionsSchema = z.object({
    limit: CurrencyAmountSchema.nullable().optional(),
    interval: z.string().nullable().optional(),
    next_interval_resets_at: z.string().nullable().optional(),
    start_of_interval: z.string().nullable().optional(),
    temporary_limit: CurrencyAmountSchema.nullable().optional(),
    transaction_amount_limit: CurrencyAmountSchema.nullable().optional(),
    allowed_category_codes: z.array(z.number()).nullable().optional(),
    blocked_category_codes: z.array(z.number()).nullable().optional(),
    allowed_vendor_ids: z.array(z.string()).nullable().optional(),
    blocked_vendor_ids: z.array(z.string()).nullable().optional(),
    auto_lock_date: z.string().nullable().optional()
});

const FundSchema = z.object({
    id: z.string(),
    display_name: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    balance: z
        .object({
            cleared: CurrencyAmountSchema.nullable().optional(),
            pending: CurrencyAmountSchema.nullable().optional(),
            total: CurrencyAmountSchema.nullable().optional()
        })
        .nullable()
        .optional(),
    spending_restrictions: SpendingRestrictionsSchema.nullable().optional(),
    permitted_spend_types: z
        .object({
            physical_card_enabled: z.boolean().nullable().optional(),
            virtual_card_enabled: z.boolean().nullable().optional(),
            reimbursements_enabled: z.boolean().nullable().optional()
        })
        .nullable()
        .optional(),
    entity_id: z.string().nullable().optional(),
    spend_program_id: z.string().nullable().optional(),
    is_shareable: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional()
});

const PhysicalCardSchema = z.object({
    id: z.string(),
    state: z.string().nullable().optional(),
    is_suspended: z.boolean().nullable().optional(),
    display_name: z.string().nullable().optional(),
    last_four: z.string().nullable().optional(),
    expiration: z.string().nullable().optional(),
    cardholder_id: z.string().nullable().optional(),
    cardholder_name: z.string().nullable().optional(),
    fund_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional()
});

const VirtualCardSchema = z.object({
    id: z.string(),
    fund_id: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
    is_card_suspended: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional()
});

const TransactionSchema = z.object({
    id: z.string(),
    card_id: z.string().nullable().optional(),
    fund_id: z.string().nullable().optional(),
    merchant_name: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    entity_amount: z
        .object({
            value: z.number(),
            currency: z.string()
        })
        .nullable()
        .optional(),
    amount: z.number().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    minor_unit_conversion_rate: z.number().nullable().optional(),
    sk_category_name: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    user_transaction_time: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    all_requirements_met_and_approved: z.boolean().nullable().optional(),
    card_present: z.boolean().nullable().optional()
});

const TransactionsResponseSchema = z.object({
    data: z.array(TransactionSchema)
});

const CurrencyAmountOutputSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().optional().describe('ISO 4217 currency code for the amount, e.g. "USD".'),
    minor_unit_conversion_rate: z.number().optional().describe('Divisor that converts `amount` to the major currency unit (e.g. 100 for USD).')
});

const SpendingRestrictionsOutputSchema = z.object({
    limit: CurrencyAmountOutputSchema.optional().describe('Spending limit for the current interval.'),
    interval: z.string().optional().describe('Interval the limit resets on, e.g. MONTHLY.'),
    next_interval_resets_at: z.string().optional().describe('ISO 8601 timestamp when the current interval and limit reset.'),
    start_of_interval: z.string().optional().describe('ISO 8601 timestamp when the current interval started.'),
    temporary_limit: CurrencyAmountOutputSchema.optional().describe('Temporary spending limit currently in effect, if any.'),
    transaction_amount_limit: CurrencyAmountOutputSchema.optional().describe('Maximum amount allowed for a single transaction, if set.'),
    allowed_category_codes: z.array(z.number()).optional().describe('Ramp category codes the fund is restricted to; omitted when unrestricted.'),
    blocked_category_codes: z.array(z.number()).optional().describe('Ramp category codes blocked for the fund; omitted when none are blocked.'),
    allowed_vendor_ids: z.array(z.string()).optional().describe('Vendor IDs the fund is restricted to; omitted when unrestricted.'),
    blocked_vendor_ids: z.array(z.string()).optional().describe('Vendor IDs blocked for the fund; omitted when none are blocked.'),
    auto_lock_date: z.string().optional().describe('ISO 8601 timestamp when the fund automatically locks, if set.')
});

const FundOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the fund.'),
    display_name: z.string().optional().describe('Display name of the fund.'),
    state: z.string().optional().describe('Fund state, e.g. ACTIVE, SUSPENDED, TERMINATED.'),
    balance: z
        .object({
            cleared: CurrencyAmountOutputSchema.optional().describe('Cleared (settled) amount spent on the fund.'),
            pending: CurrencyAmountOutputSchema.optional().describe('Pending amount toward the fund.'),
            total: CurrencyAmountOutputSchema.optional().describe('Total amount spent on the fund.')
        })
        .optional()
        .describe('Current balance breakdown for the fund.'),
    spending_restrictions: SpendingRestrictionsOutputSchema.optional().describe('Spending restrictions configured on the fund.'),
    permitted_spend_types: z
        .object({
            physical_card_enabled: z.boolean().optional().describe('Whether physical cards can be linked to the fund.'),
            virtual_card_enabled: z.boolean().optional().describe('Whether virtual cards can be linked to the fund.'),
            reimbursements_enabled: z.boolean().optional().describe('Whether reimbursements can be submitted against the fund.')
        })
        .optional()
        .describe('Spend types permitted on the fund.'),
    entity_id: z.string().optional().describe('Identifier of the business entity that owns the fund.'),
    spend_program_id: z.string().optional().describe('Identifier of the spend program the fund inherits settings from.'),
    is_shareable: z.boolean().optional().describe('Whether the fund can be shared by multiple users.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the fund was created.')
});

const CardOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the card.'),
    card_type: z.enum(['physical', 'virtual']).describe('Whether the card is a physical card or a virtual card.'),
    fund_id: z.string().optional().describe('Identifier of the fund linked to the card, when the provider returns one.'),
    display_name: z.string().optional().describe('Cosmetic display name of the card (physical cards only).'),
    last_four: z.string().optional().describe('Last four digits of the card number; may be "*REDACTED*" for suspended or terminated cards.'),
    expiration: z.string().optional().describe('Card expiration date in MMYY format (physical cards only).'),
    state: z.string().optional().describe('Card lifecycle state (physical cards only), e.g. ACTIVE, SUSPENDED, TERMINATED.'),
    is_suspended: z.boolean().describe('Whether the card is currently suspended.'),
    cardholder_id: z.string().optional().describe('Identifier of the user who holds the card.'),
    cardholder_name: z.string().optional().describe('Full name of the cardholder (physical cards only).'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created.')
});

const TransactionOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the transaction.'),
    card_id: z.string().optional().describe('Identifier of the card used for the transaction.'),
    fund_id: z.string().optional().describe('Identifier of the fund the transaction is attributed to.'),
    merchant_name: z.string().optional().describe('Merchant name for the transaction.'),
    state: z.string().optional().describe('Transaction state, e.g. CLEARED, PENDING, DECLINED.'),
    amount: z.number().optional().describe('Settled amount in the smallest currency unit (e.g. cents), signed so refunds can be negative.'),
    currency_code: z.string().optional().describe('ISO 4217 currency code for `amount`.'),
    sk_category_name: z.string().optional().describe('Ramp spending category name for the transaction.'),
    memo: z.string().optional().describe('Memo attached to the transaction.'),
    user_transaction_time: z.string().optional().describe('ISO 8601 timestamp when the transaction was created by the user.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the transaction was last updated.'),
    all_requirements_met_and_approved: z.boolean().optional().describe('Whether the transaction is fully approved with all cardholder requirements met.'),
    card_present: z.boolean().optional().describe('Whether the transaction was made with a card-present terminal.')
});

const InputSchema = z.object({
    card_id: z.string().describe('Identifier of the card to inspect (physical or virtual). Example: "a2d25ac2-5528-4c16-ba51-cd258d8d09f7".'),
    card_type: z
        .enum(['physical', 'virtual'])
        .optional()
        .describe(
            'Optional card type hint. When omitted, the card is resolved by trying the physical endpoint first and falling back to the virtual endpoint.'
        ),
    fund_id: z.string().optional().describe('Optional fund identifier to use when the card itself does not expose a linked fund (e.g. some physical cards).')
});

const OutputSchema = z.object({
    card: CardOutputSchema.describe('The resolved card (physical or virtual).'),
    fund: FundOutputSchema.nullable().describe('The fund linked to the card, or null when the card has no linked fund.'),
    recent_transactions: z.array(TransactionOutputSchema).describe('Most recent transactions on the card, newest first (up to 10), including declined ones.')
});

function isNotFoundError(error: unknown): boolean {
    const parsed = z
        .object({
            response: z.object({ status: z.number() }).optional()
        })
        .safeParse(error);
    return parsed.success && parsed.data.response?.status === 404;
}

function mapAmount(amount: z.infer<typeof CurrencyAmountSchema>): z.infer<typeof CurrencyAmountOutputSchema> {
    return {
        amount: amount.amount,
        ...(amount.currency_code != null && { currency_code: amount.currency_code }),
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapFund(fund: z.infer<typeof FundSchema>): z.infer<typeof FundOutputSchema> {
    const restrictions = fund.spending_restrictions;
    const permitted = fund.permitted_spend_types;
    return {
        id: fund.id,
        ...(fund.display_name != null && { display_name: fund.display_name }),
        ...(fund.state != null && { state: fund.state }),
        ...(fund.balance != null && {
            balance: {
                ...(fund.balance.cleared != null && { cleared: mapAmount(fund.balance.cleared) }),
                ...(fund.balance.pending != null && { pending: mapAmount(fund.balance.pending) }),
                ...(fund.balance.total != null && { total: mapAmount(fund.balance.total) })
            }
        }),
        ...(restrictions != null && {
            spending_restrictions: {
                ...(restrictions.limit != null && { limit: mapAmount(restrictions.limit) }),
                ...(restrictions.interval != null && { interval: restrictions.interval }),
                ...(restrictions.next_interval_resets_at != null && { next_interval_resets_at: restrictions.next_interval_resets_at }),
                ...(restrictions.start_of_interval != null && { start_of_interval: restrictions.start_of_interval }),
                ...(restrictions.temporary_limit != null && { temporary_limit: mapAmount(restrictions.temporary_limit) }),
                ...(restrictions.transaction_amount_limit != null && { transaction_amount_limit: mapAmount(restrictions.transaction_amount_limit) }),
                ...(restrictions.allowed_category_codes != null && { allowed_category_codes: restrictions.allowed_category_codes }),
                ...(restrictions.blocked_category_codes != null && { blocked_category_codes: restrictions.blocked_category_codes }),
                ...(restrictions.allowed_vendor_ids != null && { allowed_vendor_ids: restrictions.allowed_vendor_ids }),
                ...(restrictions.blocked_vendor_ids != null && { blocked_vendor_ids: restrictions.blocked_vendor_ids }),
                ...(restrictions.auto_lock_date != null && { auto_lock_date: restrictions.auto_lock_date })
            }
        }),
        ...(permitted != null && {
            permitted_spend_types: {
                ...(permitted.physical_card_enabled != null && { physical_card_enabled: permitted.physical_card_enabled }),
                ...(permitted.virtual_card_enabled != null && { virtual_card_enabled: permitted.virtual_card_enabled }),
                ...(permitted.reimbursements_enabled != null && { reimbursements_enabled: permitted.reimbursements_enabled })
            }
        }),
        ...(fund.entity_id != null && { entity_id: fund.entity_id }),
        ...(fund.spend_program_id != null && { spend_program_id: fund.spend_program_id }),
        ...(fund.is_shareable != null && { is_shareable: fund.is_shareable }),
        ...(fund.created_at != null && { created_at: fund.created_at })
    };
}

function mapTransaction(transaction: z.infer<typeof TransactionSchema>): z.infer<typeof TransactionOutputSchema> {
    // The deprecated top-level `amount` is in major units (e.g. 428.49), so it is only used as a fallback once converted to minor units.
    const rate = transaction.minor_unit_conversion_rate;
    const amount =
        transaction.entity_amount ??
        (transaction.amount != null && rate != null ? { value: Math.round(transaction.amount * rate), currency: transaction.currency_code } : null);
    return {
        id: transaction.id,
        ...(transaction.card_id != null && { card_id: transaction.card_id }),
        ...(transaction.fund_id != null && { fund_id: transaction.fund_id }),
        ...(transaction.merchant_name != null && { merchant_name: transaction.merchant_name }),
        ...(transaction.state != null && { state: transaction.state }),
        ...(amount != null && amount.currency != null && { amount: amount.value, currency_code: amount.currency }),
        ...(transaction.sk_category_name != null && { sk_category_name: transaction.sk_category_name }),
        ...(transaction.memo != null && { memo: transaction.memo }),
        ...(transaction.user_transaction_time != null && { user_transaction_time: transaction.user_transaction_time }),
        ...(transaction.updated_at != null && { updated_at: transaction.updated_at }),
        ...(transaction.all_requirements_met_and_approved != null && { all_requirements_met_and_approved: transaction.all_requirements_met_and_approved }),
        ...(transaction.card_present != null && { card_present: transaction.card_present })
    };
}

/**
 * @tags: [read]
 * @tagReason: Resolves a card and reads its linked fund and recent transactions from Ramp; it never creates, updates, or deletes provider data.
 * @pitfalls: Physical cards may not expose a linked fund, so `fund` is null unless `fund_id` is supplied, suspended or terminated cards can return `last_four` and `expiration` as "*REDACTED*", and `recent_transactions` includes declined attempts (state DECLINED, amount 0).
 */
const action = createAction({
    description: "Composite: a card (physical or virtual) merged with its fund's current spending limit/balance and its recent transactions.",
    version: '1.0.0',
    input: InputSchema.describe('A card to inspect and an optional fund override.'),
    output: OutputSchema.describe('The resolved card, its linked fund, and its most recent transactions.'),
    scopes: ['cards:read', 'funds:read', 'transactions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let cardType: 'physical' | 'virtual';
        let physical: z.infer<typeof PhysicalCardSchema> | null = null;
        let virtual: z.infer<typeof VirtualCardSchema> | null = null;

        const fetchPhysicalCard = async (): Promise<z.infer<typeof PhysicalCardSchema> | null> => {
            const response = await nango.get({
                // https://docs.ramp.com/developer-api/v1/overview/introduction
                endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}`,
                retries: 3
            });
            if (response.status === 404) {
                return null;
            }
            return PhysicalCardSchema.parse(response.data);
        };

        const fetchVirtualCard = async (): Promise<z.infer<typeof VirtualCardSchema> | null> => {
            const response = await nango.get({
                // https://docs.ramp.com/developer-api/v1/overview/introduction
                endpoint: `/developer/v1/cards/virtual/${encodeURIComponent(input.card_id)}`,
                retries: 3
            });
            if (response.status === 404) {
                return null;
            }
            return VirtualCardSchema.parse(response.data);
        };

        if (input.card_type === 'physical') {
            cardType = 'physical';
            physical = await fetchPhysicalCard();
            if (physical == null) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Physical card not found',
                    card_id: input.card_id
                });
            }
        } else if (input.card_type === 'virtual') {
            cardType = 'virtual';
            virtual = await fetchVirtualCard();
            if (virtual == null) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Virtual card not found',
                    card_id: input.card_id
                });
            }
        } else {
            // @allowTryCatch - the physical-card lookup returns 404 for virtual card IDs (thrown live, returned as a 404 status in recorded mocks), so probe it first and fall back to the virtual-card endpoint.
            try {
                physical = await fetchPhysicalCard();
            } catch (error) {
                if (!isNotFoundError(error)) {
                    throw error;
                }
                physical = null;
            }
            if (physical != null) {
                cardType = 'physical';
            } else {
                virtual = await fetchVirtualCard();
                if (virtual == null) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'Card not found',
                        card_id: input.card_id
                    });
                }
                cardType = 'virtual';
            }
        }

        let card: z.infer<typeof CardOutputSchema>;
        if (cardType === 'physical' && physical != null) {
            card = {
                id: physical.id,
                card_type: 'physical',
                is_suspended: physical.is_suspended ?? false,
                ...(physical.fund_id != null && { fund_id: physical.fund_id }),
                ...(physical.display_name != null && { display_name: physical.display_name }),
                ...(physical.last_four != null && { last_four: physical.last_four }),
                ...(physical.expiration != null && { expiration: physical.expiration }),
                ...(physical.state != null && { state: physical.state }),
                ...(physical.cardholder_id != null && { cardholder_id: physical.cardholder_id }),
                ...(physical.cardholder_name != null && { cardholder_name: physical.cardholder_name }),
                ...(physical.created_at != null && { created_at: physical.created_at })
            };
        } else if (virtual != null) {
            card = {
                id: virtual.id,
                card_type: 'virtual',
                is_suspended: virtual.is_card_suspended ?? false,
                ...(virtual.fund_id != null && { fund_id: virtual.fund_id }),
                ...(virtual.user_id != null && { cardholder_id: virtual.user_id }),
                ...(virtual.created_at != null && { created_at: virtual.created_at })
            };
        } else {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Card not found',
                card_id: input.card_id
            });
        }

        const fundId = input.fund_id ?? card.fund_id;
        let fund: z.infer<typeof FundOutputSchema> | null = null;
        if (fundId != null) {
            const fundResponse = await nango.get({
                // https://docs.ramp.com/developer-api/v1/overview/introduction
                endpoint: `/developer/v1/funds/${encodeURIComponent(fundId)}`,
                retries: 3
            });
            fund = mapFund(FundSchema.parse(fundResponse.data));
        }

        const transactionsResponse = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: '/developer/v1/transactions',
            params: {
                card_id: input.card_id,
                // Ramp excludes declined transactions unless state is ALL.
                state: 'ALL',
                page_size: 10,
                order_by_date_desc: 'true'
            },
            retries: 3
        });
        const recent_transactions = TransactionsResponseSchema.parse(transactionsResponse.data).data.map(mapTransaction);

        return {
            card,
            fund,
            recent_transactions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
