import { createSync } from 'nango';
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

const CheckpointSchema = z.object({
    offset: z.number().int()
});

const sync = createSync({
    description: 'Sync scenarios for a team',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
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

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        let offset = checkpointResult.success ? checkpointResult.data.offset : 0;
        const limit = 500;

        // https://developers.make.com/api-documentation/
        // Provider only exposes /scenarios with no changed-since filter,
        // so we use full-refresh delete tracking with a resumable offset checkpoint.
        await nango.trackDeletesStart('Scenario');

        const mapScenarios = (page: unknown[]) =>
            page.map((record) => {
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

        let hasMore = true;
        while (hasMore) {
            const response = await nango.get({
                // https://developers.make.com/api-documentation/
                endpoint: '/scenarios',
                params: {
                    teamId: metadata.team_id,
                    'pg[limit]': String(limit),
                    'pg[offset]': String(offset)
                },
                retries: 3
            });

            const pageResult = z.object({ scenarios: z.array(z.unknown()) }).safeParse(response.data);
            if (!pageResult.success) {
                throw new Error('Unexpected scenarios page format');
            }

            const scenarios = mapScenarios(pageResult.data.scenarios);
            if (scenarios.length > 0) {
                await nango.batchSave(scenarios, 'Scenario');
            }

            hasMore = scenarios.length === limit;
            if (hasMore) {
                offset += scenarios.length;
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Scenario');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
