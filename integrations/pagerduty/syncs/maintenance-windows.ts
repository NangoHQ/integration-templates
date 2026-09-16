import { createSync } from 'nango';
import { z } from 'zod';

// --- Provider response schemas (no .describe required) ---

const ProviderReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderMaintenanceWindowSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    sequence_number: z.number().optional(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().nullable().optional(),
    created_by: ProviderReferenceSchema.nullable().optional(),
    services: z.array(ProviderReferenceSchema).nullable().optional(),
    teams: z.array(ProviderReferenceSchema).nullable().optional()
});

// --- Public model schemas (every root and field needs .describe) ---

const ReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the referenced resource.'),
        type: z.string().describe('A string that determines the schema of the object.'),
        summary: z.string().optional().describe('A short-form, server-generated string that provides succinct information about the referenced object.'),
        self: z.string().optional().describe('The API show URL at which the referenced object is accessible.'),
        html_url: z.string().optional().describe('A URL at which the referenced entity is uniquely displayed in the Web app.')
    })
    .describe('A reference to another PagerDuty resource included as a nested object.');

const MaintenanceWindowSchema = z
    .object({
        id: z.string().describe('The unique identifier of the maintenance window.'),
        type: z.string().optional().describe('The type of object. Always "maintenance_window" for maintenance windows.'),
        summary: z.string().optional().describe('A short-form, server-generated string that provides succinct information about the maintenance window.'),
        self: z.string().optional().describe('The API show URL at which the maintenance window is accessible.'),
        html_url: z.string().optional().describe('A URL at which the maintenance window is uniquely displayed in the Web app.'),
        sequence_number: z.number().optional().describe('The order in which the maintenance window was created.'),
        start_time: z.string().describe('The maintenance window start time in ISO 8601 format. Services stop creating incidents during this window.'),
        end_time: z.string().describe('The maintenance window end time in ISO 8601 format. Services resume creating incidents after this time.'),
        description: z.string().optional().describe('A user-provided description for this maintenance window.'),
        created_by: ReferenceSchema.optional().describe('The user who created the maintenance window.'),
        services: z.array(ReferenceSchema).optional().describe('The services that are disabled during this maintenance window.'),
        teams: z.array(ReferenceSchema).optional().describe('The teams associated with this maintenance window.')
    })
    .describe('A PagerDuty maintenance window used to temporarily disable one or more services for a set period of time.');

const CheckpointSchema = z.object({
    offset: z.number()
});

const sync = createSync({
    description: 'Sync maintenance windows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MaintenanceWindow: MaintenanceWindowSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        let currentOffset = checkpoint?.offset ?? 0;

        await nango.trackDeletesStart('MaintenanceWindow');

        // https://developer.pagerduty.com/api-reference/d738c8a4c2baf-list-maintenance-windows
        for await (const page of nango.paginate({
            endpoint: '/maintenance_windows',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: currentOffset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'maintenance_windows'
            },
            retries: 3
        })) {
            const parsedPage = z.array(ProviderMaintenanceWindowSchema).safeParse(page);

            if (!parsedPage.success) {
                throw new Error(`Failed to parse maintenance windows page: ${parsedPage.error.message}`);
            }

            const maintenanceWindows = parsedPage.data.map((record) => ({
                id: record.id,
                ...(record.type != null && { type: record.type }),
                ...(record.summary != null && { summary: record.summary }),
                ...(record.self != null && { self: record.self }),
                ...(record.html_url != null && { html_url: record.html_url }),
                ...(record.sequence_number != null && { sequence_number: record.sequence_number }),
                start_time: record.start_time,
                end_time: record.end_time,
                ...(record.description != null && { description: record.description }),
                ...(record.created_by != null && {
                    created_by: {
                        id: record.created_by.id,
                        type: record.created_by.type,
                        ...(record.created_by.summary != null && { summary: record.created_by.summary }),
                        ...(record.created_by.self != null && { self: record.created_by.self }),
                        ...(record.created_by.html_url != null && { html_url: record.created_by.html_url })
                    }
                }),
                ...(record.services != null && {
                    services: record.services.map((service) => ({
                        id: service.id,
                        type: service.type,
                        ...(service.summary != null && { summary: service.summary }),
                        ...(service.self != null && { self: service.self }),
                        ...(service.html_url != null && { html_url: service.html_url })
                    }))
                }),
                ...(record.teams != null && {
                    teams: record.teams.map((team) => ({
                        id: team.id,
                        type: team.type,
                        ...(team.summary != null && { summary: team.summary }),
                        ...(team.self != null && { self: team.self }),
                        ...(team.html_url != null && { html_url: team.html_url })
                    }))
                })
            }));

            if (maintenanceWindows.length > 0) {
                await nango.batchSave(maintenanceWindows, 'MaintenanceWindow');
            }

            currentOffset += parsedPage.data.length;
            await nango.saveCheckpoint({ offset: currentOffset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('MaintenanceWindow');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
