import { createSync } from 'nango';
import { z } from 'zod';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const Many2OneSchema = z.union([z.tuple([z.number().int(), z.string()]), z.literal(false)]);

const OdooOptionalString = z.union([z.string(), z.literal(false)]).optional();
const OdooOptionalNumber = z.union([z.number(), z.literal(false)]).optional();

const ProviderSaleOrderSchema = z
    .object({
        id: z.number().int(),
        name: OdooOptionalString,
        partner_id: Many2OneSchema.optional(),
        state: OdooOptionalString,
        amount_total: OdooOptionalNumber,
        amount_untaxed: OdooOptionalNumber,
        amount_tax: OdooOptionalNumber,
        currency_id: Many2OneSchema.optional(),
        user_id: Many2OneSchema.optional(),
        team_id: Many2OneSchema.optional(),
        date_order: OdooOptionalString,
        validity_date: OdooOptionalString,
        create_date: OdooOptionalString,
        write_date: z.string(),
        invoice_status: OdooOptionalString,
        delivery_status: OdooOptionalString,
        payment_term_id: Many2OneSchema.optional(),
        pricelist_id: Many2OneSchema.optional(),
        company_id: Many2OneSchema.optional(),
        origin: OdooOptionalString,
        client_order_ref: OdooOptionalString,
        partner_invoice_id: Many2OneSchema.optional(),
        partner_shipping_id: Many2OneSchema.optional(),
        commitment_date: OdooOptionalString,
        expected_date: OdooOptionalString,
        note: OdooOptionalString
    })
    .passthrough();

const SaleOrderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    partner_id: z.string().optional(),
    partner_name: z.string().optional(),
    state: z.string().optional(),
    amount_total: z.number().optional(),
    amount_untaxed: z.number().optional(),
    amount_tax: z.number().optional(),
    currency_id: z.string().optional(),
    currency_name: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    team_id: z.string().optional(),
    team_name: z.string().optional(),
    date_order: z.string().optional(),
    validity_date: z.string().optional(),
    create_date: z.string().optional(),
    write_date: z.string(),
    invoice_status: z.string().optional(),
    delivery_status: z.string().optional(),
    payment_term_id: z.string().optional(),
    payment_term_name: z.string().optional(),
    pricelist_id: z.string().optional(),
    pricelist_name: z.string().optional(),
    company_id: z.string().optional(),
    company_name: z.string().optional(),
    origin: z.string().optional(),
    client_order_ref: z.string().optional(),
    partner_invoice_id: z.string().optional(),
    partner_invoice_name: z.string().optional(),
    partner_shipping_id: z.string().optional(),
    partner_shipping_name: z.string().optional(),
    commitment_date: z.string().optional(),
    expected_date: z.string().optional(),
    note: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function extractMany2One(value: unknown): { id?: string; name?: string } {
    const parsed = Many2OneSchema.safeParse(value);
    if (parsed.success && parsed.data !== false) {
        return { id: String(parsed.data[0]), name: parsed.data[1] };
    }
    return {};
}

function buildDomain(checkpoint: Checkpoint): unknown[] {
    if (!checkpoint.updated_after) {
        return [];
    }

    if ((checkpoint.last_id ?? 0) > 0) {
        return ['|', ['write_date', '>', checkpoint.updated_after], '&', ['write_date', '=', checkpoint.updated_after], ['id', '>', checkpoint.last_id]];
    }

    return [['write_date', '>', checkpoint.updated_after]];
}

const sync = createSync({
    description: 'Sync Odoo sale orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        SaleOrder: SaleOrderSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };
        const limit = 100;

        // Using a manual loop because nango.paginate() requires the provider template
        // to be present in the runner's provider cache, which is not yet available for
        // odoo-api-key on the current Nango server version.
        while (true) {
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            const response = await nango.post({
                endpoint: '/json/2/sale.order/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: [
                        'id',
                        'name',
                        'partner_id',
                        'state',
                        'amount_total',
                        'amount_untaxed',
                        'amount_tax',
                        'currency_id',
                        'user_id',
                        'team_id',
                        'date_order',
                        'validity_date',
                        'create_date',
                        'write_date',
                        'invoice_status',
                        'delivery_status',
                        'payment_term_id',
                        'pricelist_id',
                        'company_id',
                        'origin',
                        'client_order_ref',
                        'partner_invoice_id',
                        'partner_shipping_id',
                        'commitment_date',
                        'expected_date',
                        'note'
                    ],
                    order: 'write_date asc, id asc',
                    limit
                },
                baseUrlOverride,
                headers,
                retries: 3
            });

            const records = z.array(z.unknown()).parse(response.data);
            if (records.length === 0) {
                break;
            }

            const saleOrders = [];
            let lastRecord: z.infer<typeof ProviderSaleOrderSchema> | undefined;

            for (const raw of records) {
                const parsed = ProviderSaleOrderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse sale order record: ${parsed.error.message}`);
                }

                const providerRecord = parsed.data;
                lastRecord = providerRecord;
                const partner = extractMany2One(providerRecord.partner_id);
                const currency = extractMany2One(providerRecord.currency_id);
                const user = extractMany2One(providerRecord.user_id);
                const team = extractMany2One(providerRecord.team_id);
                const paymentTerm = extractMany2One(providerRecord.payment_term_id);
                const pricelist = extractMany2One(providerRecord.pricelist_id);
                const company = extractMany2One(providerRecord.company_id);
                const partnerInvoice = extractMany2One(providerRecord.partner_invoice_id);
                const partnerShipping = extractMany2One(providerRecord.partner_shipping_id);

                saleOrders.push({
                    id: String(providerRecord.id),
                    ...(typeof providerRecord.name === 'string' && { name: providerRecord.name }),
                    ...(partner.id !== undefined && { partner_id: partner.id }),
                    ...(partner.name !== undefined && { partner_name: partner.name }),
                    ...(typeof providerRecord.state === 'string' && { state: providerRecord.state }),
                    ...(typeof providerRecord.amount_total === 'number' && { amount_total: providerRecord.amount_total }),
                    ...(typeof providerRecord.amount_untaxed === 'number' && { amount_untaxed: providerRecord.amount_untaxed }),
                    ...(typeof providerRecord.amount_tax === 'number' && { amount_tax: providerRecord.amount_tax }),
                    ...(currency.id !== undefined && { currency_id: currency.id }),
                    ...(currency.name !== undefined && { currency_name: currency.name }),
                    ...(user.id !== undefined && { user_id: user.id }),
                    ...(user.name !== undefined && { user_name: user.name }),
                    ...(team.id !== undefined && { team_id: team.id }),
                    ...(team.name !== undefined && { team_name: team.name }),
                    ...(typeof providerRecord.date_order === 'string' && { date_order: providerRecord.date_order }),
                    ...(typeof providerRecord.validity_date === 'string' && { validity_date: providerRecord.validity_date }),
                    ...(typeof providerRecord.create_date === 'string' && { create_date: providerRecord.create_date }),
                    write_date: providerRecord.write_date,
                    ...(typeof providerRecord.invoice_status === 'string' && { invoice_status: providerRecord.invoice_status }),
                    ...(typeof providerRecord.delivery_status === 'string' && { delivery_status: providerRecord.delivery_status }),
                    ...(paymentTerm.id !== undefined && { payment_term_id: paymentTerm.id }),
                    ...(paymentTerm.name !== undefined && { payment_term_name: paymentTerm.name }),
                    ...(pricelist.id !== undefined && { pricelist_id: pricelist.id }),
                    ...(pricelist.name !== undefined && { pricelist_name: pricelist.name }),
                    ...(company.id !== undefined && { company_id: company.id }),
                    ...(company.name !== undefined && { company_name: company.name }),
                    ...(typeof providerRecord.origin === 'string' && { origin: providerRecord.origin }),
                    ...(typeof providerRecord.client_order_ref === 'string' && { client_order_ref: providerRecord.client_order_ref }),
                    ...(partnerInvoice.id !== undefined && { partner_invoice_id: partnerInvoice.id }),
                    ...(partnerInvoice.name !== undefined && { partner_invoice_name: partnerInvoice.name }),
                    ...(partnerShipping.id !== undefined && { partner_shipping_id: partnerShipping.id }),
                    ...(partnerShipping.name !== undefined && { partner_shipping_name: partnerShipping.name }),
                    ...(typeof providerRecord.commitment_date === 'string' && { commitment_date: providerRecord.commitment_date }),
                    ...(typeof providerRecord.expected_date === 'string' && { expected_date: providerRecord.expected_date }),
                    ...(typeof providerRecord.note === 'string' && { note: providerRecord.note })
                });
            }

            await nango.batchSave(saleOrders, 'SaleOrder');

            if (!lastRecord) {
                throw new Error('Expected at least one sale order after parsing the response page');
            }

            checkpoint = {
                updated_after: lastRecord.write_date,
                last_id: lastRecord.id
            };
            await nango.saveCheckpoint(checkpoint);

            if (records.length < limit) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
