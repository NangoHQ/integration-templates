import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SchedulingSchema = z.object({
    type: z.string().optional(),
    interval: z.number().optional()
});

const MakeScenarioSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    teamId: z.number().optional(),
    hookId: z.number().nullish(),
    description: z.string().nullish(),
    folderId: z.number().nullish(),
    isinvalid: z.boolean().optional(),
    islinked: z.boolean().optional(),
    isActive: z.boolean().optional(),
    islocked: z.boolean().optional(),
    isPaused: z.boolean().optional(),
    usedPackages: z.array(z.string()).optional(),
    lastEdit: z.string().optional(),
    scheduling: SchedulingSchema.nullish(),
    iswaiting: z.boolean().optional(),
    dlqCount: z.number().optional(),
    nextExec: z.string().nullish(),
    created: z.string().optional(),
    scenarioVersion: z.number().nullish(),
    moduleSequenceId: z.number().nullish(),
    type: z.string().optional(),
    deleted: z.boolean().optional(),
    deletedAt: z.string().nullish()
});

const ScenarioSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    teamId: z.number().optional(),
    hookId: z.number().optional(),
    description: z.string().optional(),
    folderId: z.number().optional(),
    isinvalid: z.boolean().optional(),
    isActive: z.boolean().optional(),
    islocked: z.boolean().optional(),
    isPaused: z.boolean().optional(),
    usedPackages: z.array(z.string()).optional(),
    lastEdit: z.string().optional(),
    scheduling: SchedulingSchema.optional(),
    iswaiting: z.boolean().optional(),
    dlqCount: z.number().optional(),
    nextExec: z.string().optional(),
    created: z.string().optional(),
    scenarioVersion: z.number().optional(),
    moduleSequenceId: z.number().optional(),
    type: z.string().optional(),
    deleted: z.boolean().optional(),
    deletedAt: z.string().optional()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync scenarios for a team',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Scenario: ScenarioSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success || !metadataResult.data.team_id) {
            throw new Error('team_id is required in metadata');
        }
        const metadata = metadataResult.data;

        // Blocker: provider only exposes /scenarios with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Scenario');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/scenarios',
            params: {
                teamId: metadata.team_id
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_start_value: 0,
                limit_name_in_request: 'pg[limit]',
                limit: 500,
                response_path: 'scenarios'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected scenarios page format');
            }

            const scenarios = page.map((record) => {
                const parsed = MakeScenarioSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse scenario: ${parsed.error.message}`);
                }
                const s = parsed.data;
                return {
                    id: String(s.id),
                    ...(s.name != null && { name: s.name }),
                    ...(s.teamId != null && { teamId: s.teamId }),
                    ...(s.hookId != null && { hookId: s.hookId }),
                    ...(s.description != null && { description: s.description }),
                    ...(s.folderId != null && { folderId: s.folderId }),
                    ...(s.isinvalid != null && { isinvalid: s.isinvalid }),
                    ...(s.isActive != null && { isActive: s.isActive }),
                    ...(s.islocked != null && { islocked: s.islocked }),
                    ...(s.isPaused != null && { isPaused: s.isPaused }),
                    ...(s.usedPackages != null && { usedPackages: s.usedPackages }),
                    ...(s.lastEdit != null && { lastEdit: s.lastEdit }),
                    ...(s.scheduling != null && { scheduling: s.scheduling }),
                    ...(s.iswaiting != null && { iswaiting: s.iswaiting }),
                    ...(s.dlqCount != null && { dlqCount: s.dlqCount }),
                    ...(s.nextExec != null && { nextExec: s.nextExec }),
                    ...(s.created != null && { created: s.created }),
                    ...(s.scenarioVersion != null && { scenarioVersion: s.scenarioVersion }),
                    ...(s.moduleSequenceId != null && { moduleSequenceId: s.moduleSequenceId }),
                    ...(s.type != null && { type: s.type }),
                    ...(s.deleted != null && { deleted: s.deleted }),
                    ...(s.deletedAt !== undefined && { deletedAt: s.deletedAt ?? undefined })
                };
            });

            if (scenarios.length > 0) {
                await nango.batchSave(scenarios, 'Scenario');
            }
        }

        await nango.trackDeletesEnd('Scenario');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
