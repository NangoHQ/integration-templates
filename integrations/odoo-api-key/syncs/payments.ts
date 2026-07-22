import { createSync } from 'nango';
import { z } from 'zod';

const RawPaymentSchema = z.object({
    id: z.number(),
    name: z.union([z.string(), z.literal(false)]).optional(),
    date: z.union([z.string(), z.literal(false)]).optional(),
    amount: z.union([z.number(), z.literal(false)]).optional(),
    payment_type: z.union([z.string(), z.literal(false)]).optional(),
    partner_type: z.union([z.string(), z.literal(false)]).optional(),
    state: z.union([z.string(), z.literal(false)]).optional(),
    partner_id: z.union([z.tuple([z.number(), z.string()]), z.literal(false), z.null()]).optional(),
    write_date: z.string()
});

const PaymentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    payment_type: z.string().optional(),
    partner_type: z.string().optional(),
    state: z.string().optional(),
    partner_id: z.number().optional(),
    partner_name: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function buildDomain(checkpoint: Checkpoint): Array<unknown> {
    const domain: Array<unknown> = [['partner_type', 'in', ['customer', 'supplier']]];

    if (!checkpoint.updated_after) {
        return domain;
    }

    if ((checkpoint.last_id ?? 0) > 0) {
        domain.push('|', ['write_date', '>', checkpoint.updated_after], '&', ['write_date', '=', checkpoint.updated_after], ['id', '>', checkpoint.last_id]);
        return domain;
    }

    domain.push(['write_date', '>', checkpoint.updated_after]);
    return domain;
}

const sync = createSync({
    description: 'Sync Odoo customer and vendor payments',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });
        const limit = 100;

        while (true) {
            const response = await nango.post({
                // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
                endpoint: '/2/account.payment/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: ['id', 'name', 'date', 'amount', 'payment_type', 'partner_type', 'state', 'partner_id', 'write_date'],
                    order: 'write_date asc, id asc',
                    limit
                },
                retries: 3
            });

            const rawPayments = z.array(RawPaymentSchema).parse(response.data);
            if (rawPayments.length === 0) {
                break;
            }

            const payments = rawPayments.map((raw) => {
                const partnerId = Array.isArray(raw.partner_id) ? raw.partner_id[0] : undefined;
                const partnerName = Array.isArray(raw.partner_id) ? raw.partner_id[1] : undefined;

                return {
                    id: String(raw.id),
                    ...(typeof raw.name === 'string' && { name: raw.name }),
                    ...(typeof raw.date === 'string' && { date: raw.date }),
                    ...(typeof raw.amount === 'number' && { amount: raw.amount }),
                    ...(typeof raw.payment_type === 'string' && { payment_type: raw.payment_type }),
                    ...(typeof raw.partner_type === 'string' && { partner_type: raw.partner_type }),
                    ...(typeof raw.state === 'string' && { state: raw.state }),
                    ...(partnerId !== undefined && { partner_id: partnerId }),
                    ...(partnerName !== undefined && { partner_name: partnerName }),
                    write_date: raw.write_date
                };
            });

            await nango.batchSave(payments, 'Payment');

            const lastPayment = rawPayments.at(-1);
            if (!lastPayment) {
                throw new Error('Expected at least one payment after parsing the response page');
            }

            checkpoint = {
                updated_after: lastPayment.write_date,
                last_id: lastPayment.id
            };
            await nango.saveCheckpoint(checkpoint);

            if (rawPayments.length < limit) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
