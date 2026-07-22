import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    is_company: z.boolean().optional(),
    write_date: z.string().optional(),
    create_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const RawContactSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.union([z.string(), z.literal(false)]).optional(),
    email: z.union([z.string(), z.literal(false)]).optional(),
    phone: z.union([z.string(), z.literal(false)]).optional(),
    is_company: z.union([z.boolean(), z.number()]).optional(),
    write_date: z.string(),
    create_date: z.union([z.string(), z.literal(false)]).optional()
});

function extractString(value: string | false | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
}

function extractBoolean(value: boolean | number | undefined): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return Boolean(value);
    }
    return undefined;
}

function extractRecordId(value: string | number): number {
    const numericId = Number(value);
    if (!Number.isInteger(numericId) || numericId < 0) {
        throw new Error(`Expected a numeric Odoo record id but received ${String(value)}`);
    }

    return numericId;
}

function buildDomain(checkpoint: Checkpoint): Array<unknown> {
    if (!checkpoint.updated_after) {
        return [];
    }

    if ((checkpoint.last_id ?? 0) > 0) {
        return ['|', ['write_date', '>', checkpoint.updated_after], '&', ['write_date', '=', checkpoint.updated_after], ['id', '>', checkpoint.last_id]];
    }

    return [['write_date', '>', checkpoint.updated_after]];
}

const sync = createSync({
    description: 'Sync Odoo contacts and companies.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });

        const metadata = await nango.getMetadata();
        const serverUrl = typeof metadata?.['serverUrl'] === 'string' ? metadata['serverUrl'] : '';
        const limit = 100;

        while (true) {
            const response = await nango.post({
                // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
                endpoint: '/json/2/res.partner/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: ['id', 'name', 'email', 'phone', 'is_company', 'write_date', 'create_date'],
                    order: 'write_date asc, id asc',
                    limit
                },
                baseUrlOverride: serverUrl ? `https://${serverUrl}` : undefined,
                retries: 3
            });

            const rawRecords = z.array(RawContactSchema).parse(response.data);
            if (rawRecords.length === 0) {
                break;
            }

            const contacts: Array<z.infer<typeof ContactSchema>> = [];

            for (const raw of rawRecords) {
                contacts.push({
                    id: String(raw.id),
                    name: extractString(raw.name),
                    email: extractString(raw.email),
                    phone: extractString(raw.phone),
                    is_company: extractBoolean(raw.is_company),
                    write_date: raw.write_date,
                    create_date: extractString(raw.create_date)
                });
            }

            await nango.batchSave(contacts, 'Contact');

            const lastRecord = rawRecords.at(-1);
            if (!lastRecord) {
                throw new Error('Expected at least one contact after parsing the response page');
            }

            checkpoint = {
                updated_after: lastRecord.write_date,
                last_id: extractRecordId(lastRecord.id)
            };
            await nango.saveCheckpoint(checkpoint);

            if (rawRecords.length < limit) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
