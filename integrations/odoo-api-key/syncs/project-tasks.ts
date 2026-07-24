import { createSync } from 'nango';
import { z } from 'zod';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const ProjectTaskSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    write_date: z.string().optional(),
    create_date: z.string().optional(),
    project_id: z.number().int().optional(),
    user_ids: z.array(z.number().int()).optional(),
    partner_id: z.number().int().optional(),
    stage_id: z.number().int().optional(),
    priority: z.string().optional(),
    state: z.string().optional(),
    description: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const OdooOptionalString = z
    .union([z.string(), z.literal(false)])
    .optional()
    .nullable();

const RawProjectTaskSchema = z.object({
    id: z.number().int(),
    name: OdooOptionalString,
    write_date: z.string(),
    create_date: OdooOptionalString,
    project_id: z
        .union([z.tuple([z.number().int(), z.string()]), z.literal(false)])
        .optional()
        .nullable(),
    user_ids: z
        .union([z.array(z.number().int()), z.literal(false)])
        .optional()
        .nullable(),
    partner_id: z
        .union([z.tuple([z.number().int(), z.string()]), z.literal(false)])
        .optional()
        .nullable(),
    stage_id: z
        .union([z.tuple([z.number().int(), z.string()]), z.literal(false)])
        .optional()
        .nullable(),
    priority: OdooOptionalString,
    state: OdooOptionalString,
    description: OdooOptionalString
});

function normalizeStringOrFalse(value: string | false | null | undefined): string | undefined {
    if (value === false || value === undefined || value === null) {
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
    description: 'Sync Odoo project tasks.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        ProjectTask: ProjectTaskSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };
        const limit = 100;

        while (true) {
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            const response = await nango.post({
                endpoint: '/json/2/project.task/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: ['id', 'name', 'write_date', 'create_date', 'project_id', 'user_ids', 'partner_id', 'stage_id', 'priority', 'state', 'description'],
                    limit,
                    order: 'write_date asc, id asc'
                },
                baseUrlOverride,
                headers,
                retries: 3
            });

            let rawData = response.data;
            if (typeof rawData === 'string') {
                rawData = JSON.parse(rawData);
            }
            const rawRecords = z.array(RawProjectTaskSchema).parse(rawData);

            if (rawRecords.length === 0) {
                break;
            }

            const tasks = rawRecords.map((record) => {
                const name = normalizeStringOrFalse(record.name);
                const createDate = normalizeStringOrFalse(record.create_date);
                const priority = normalizeStringOrFalse(record.priority);
                const state = normalizeStringOrFalse(record.state);
                const description = normalizeStringOrFalse(record.description);

                return {
                    id: String(record.id),
                    ...(name !== undefined && { name }),
                    write_date: record.write_date,
                    ...(createDate !== undefined && { create_date: createDate }),
                    ...(record.project_id && Array.isArray(record.project_id) && { project_id: record.project_id[0] }),
                    ...(record.user_ids && Array.isArray(record.user_ids) && { user_ids: record.user_ids }),
                    ...(record.partner_id && Array.isArray(record.partner_id) && { partner_id: record.partner_id[0] }),
                    ...(record.stage_id && Array.isArray(record.stage_id) && { stage_id: record.stage_id[0] }),
                    ...(priority !== undefined && { priority }),
                    ...(state !== undefined && { state }),
                    ...(description !== undefined && { description })
                };
            });

            await nango.batchSave(tasks, 'ProjectTask');

            const lastRecord = rawRecords.at(-1);
            if (!lastRecord) {
                throw new Error('Expected at least one project task after parsing the response page');
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
