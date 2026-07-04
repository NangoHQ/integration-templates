import { createSync } from 'nango';
import { z } from 'zod';

const MixpanelMeResponseSchema = z.object({
    results: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
    status: z.string().optional()
});

const ProviderSchemaEntrySchema = z.object({
    entityType: z.string(),
    name: z.string(),
    schemaJson: z.record(z.string(), z.unknown())
});

const ProviderListSchemasResponseSchema = z.object({
    results: z.array(ProviderSchemaEntrySchema),
    status: z.string().optional()
});

const LexiconSchemaSchema = z.object({
    id: z.string(),
    entityType: z.string(),
    name: z.string(),
    schemaJson: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync Mixpanel Lexicon schemas',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LexiconSchema: LexiconSchemaSchema
    },

    exec: async (nango) => {
        let projectId: string | undefined;

        const metadata = await nango.getMetadata();
        if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            if ('project_id' in metadata && typeof metadata['project_id'] === 'string') {
                projectId = metadata['project_id'];
            } else if ('projectId' in metadata && typeof metadata['projectId'] === 'string') {
                projectId = metadata['projectId'];
            }
        }

        if (!projectId) {
            // https://developer.mixpanel.com/reference/authentication
            const meResponse = await nango.get({
                endpoint: '/api/app/me',
                retries: 3
            });

            const meParsed = MixpanelMeResponseSchema.safeParse(meResponse.data);
            if (!meParsed.success) {
                throw new Error(`Failed to parse me response: ${meParsed.error.message}`);
            }

            const results = meParsed.data.results;
            if (results && typeof results === 'object' && !Array.isArray(results)) {
                const rawProjects = results['projects'];
                if (rawProjects && typeof rawProjects === 'object' && !Array.isArray(rawProjects)) {
                    const keys = Object.keys(rawProjects);
                    if (keys.length > 0) {
                        projectId = keys[0];
                    }

                    if (!projectId) {
                        const projectValues = Object.values(rawProjects);
                        for (const project of projectValues) {
                            if (project && typeof project === 'object' && !Array.isArray(project)) {
                                const id = project['id'];
                                if (typeof id === 'number' || typeof id === 'string') {
                                    projectId = String(id);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!projectId) {
            throw new Error('Unable to determine Mixpanel project ID. Set project_id in connection metadata.');
        }

        // https://developer.mixpanel.com/reference/list-all-schemas-for-project
        let response;
        // @allowTryCatch: gracefully exit when the service account lacks project access
        try {
            response = await nango.get({
                endpoint: `/api/app/projects/${encodeURIComponent(projectId)}/schemas`,
                retries: 3
            });
        } catch (error) {
            if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
                return;
            }
            throw error;
        }

        if (response && typeof response === 'object' && 'status' in response && response.status === 403) {
            return;
        }

        await nango.trackDeletesStart('LexiconSchema');

        const parsed = ProviderListSchemasResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse schemas response: ${parsed.error.message}`);
        }

        const records = parsed.data.results.map((entry) => ({
            id: `${entry.entityType}:${entry.name}`,
            entityType: entry.entityType,
            name: entry.name,
            ...(entry.schemaJson != null && { schemaJson: entry.schemaJson })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'LexiconSchema');
        }

        await nango.trackDeletesEnd('LexiconSchema');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
