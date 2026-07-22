import { createSync } from 'nango';
import { z } from 'zod';

const Many2oneSchema = z.union([z.tuple([z.number(), z.string()]), z.literal(false)]);

const RawCrmLeadSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.union([z.string(), z.literal(false)]).optional(),
    email_from: z.union([z.string(), z.literal(false)]).optional(),
    phone: z.union([z.string(), z.literal(false)]).optional(),
    partner_id: Many2oneSchema.optional(),
    stage_id: Many2oneSchema.optional(),
    user_id: Many2oneSchema.optional(),
    team_id: Many2oneSchema.optional(),
    create_date: z.union([z.string(), z.literal(false)]).optional(),
    write_date: z.string()
});

const CrmLeadSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    email_from: z.string().optional(),
    phone: z.string().optional(),
    partner_id: z.number().optional(),
    stage_id: z.number().optional(),
    user_id: z.number().optional(),
    team_id: z.number().optional(),
    create_date: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const ConnectionMetadataSchema = z.object({
    serverUrl: z.string(),
    database: z.string()
});

function extractMany2oneId(value: z.infer<typeof Many2oneSchema> | undefined): number | undefined {
    if (Array.isArray(value) && value.length > 0) {
        return value[0];
    }
    return undefined;
}

function normalizeStringOrFalse(value: string | false | undefined): string | undefined {
    if (value === false || value === undefined) {
        return undefined;
    }
    return value;
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
    description: 'Sync Odoo CRM leads and opportunities.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CrmLead: CrmLeadSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });

        const metadata = await nango.getMetadata();
        const parsedMetadata = ConnectionMetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Missing serverUrl or database in connection metadata: ${parsedMetadata.error.message}`);
        }
        const baseUrlOverride = `https://${parsedMetadata.data.serverUrl}`;

        const model = 'crm.lead';
        const method = 'search_read';
        const limit = 100;

        // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
        while (true) {
            const response = await nango.post({
                endpoint: `/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`,
                data: {
                    domain: buildDomain(checkpoint),
                    fields: ['id', 'name', 'type', 'email_from', 'phone', 'partner_id', 'stage_id', 'user_id', 'team_id', 'create_date', 'write_date'],
                    order: 'write_date asc, id asc',
                    limit
                },
                retries: 3,
                baseUrlOverride
            });

            const rawRecords = z.array(RawCrmLeadSchema).parse(response.data);
            if (rawRecords.length === 0) {
                break;
            }

            const leads: Array<z.infer<typeof CrmLeadSchema>> = [];

            for (const raw of rawRecords) {
                leads.push({
                    id: String(raw.id),
                    name: raw.name,
                    type: normalizeStringOrFalse(raw.type),
                    email_from: normalizeStringOrFalse(raw.email_from),
                    phone: normalizeStringOrFalse(raw.phone),
                    partner_id: extractMany2oneId(raw.partner_id),
                    stage_id: extractMany2oneId(raw.stage_id),
                    user_id: extractMany2oneId(raw.user_id),
                    team_id: extractMany2oneId(raw.team_id),
                    create_date: normalizeStringOrFalse(raw.create_date),
                    write_date: raw.write_date
                });
            }

            await nango.batchSave(leads, 'CrmLead');

            const lastRecord = rawRecords.at(-1);
            if (!lastRecord) {
                throw new Error('Expected at least one CRM lead after parsing the response page');
            }

            checkpoint = {
                updated_after: lastRecord.write_date,
                last_id: lastRecord.id
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
