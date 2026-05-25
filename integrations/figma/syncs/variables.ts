import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const VariableModelSchema = z.object({
    id: z.string(),
    subscribed_id: z.string(),
    name: z.string(),
    key: z.string(),
    variableCollectionId: z.string(),
    resolvedDataType: z.enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']),
    updatedAt: z.string(),
    fileKey: z.string()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const FileSchema = z.object({
    key: z.string(),
    name: z.string(),
    last_modified: z.string().optional()
});

const TeamProjectsResponseSchema = z.object({
    name: z.string(),
    projects: z.array(ProjectSchema)
});

const ProjectFilesResponseSchema = z.object({
    name: z.string(),
    files: z.array(FileSchema)
});

const PublishedVariableSchema = z.object({
    id: z.string(),
    subscribed_id: z.string(),
    name: z.string(),
    key: z.string(),
    variableCollectionId: z.string(),
    resolvedDataType: z.enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']),
    updatedAt: z.string()
});

const PublishedVariablesResponseSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z.object({
        variables: z.record(z.string(), PublishedVariableSchema),
        variableCollections: z.record(z.string(), z.unknown())
    })
});

const sync = createSync({
    description: 'Sync published variables from Figma',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/variables'
        }
    ],
    models: {
        Variable: VariableModelSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw ? CheckpointSchema.parse(checkpointRaw) : { updated_after: '' };
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        if (!metadata.team_id) {
            throw new Error('team_id is required in metadata');
        }

        const updatedAfter = checkpoint.updated_after || undefined;
        let maxUpdatedAt: string | undefined;

        // https://www.figma.com/developers/api#projects-endpoints
        const teamProjectsResponse = await nango.get({
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/projects`,
            retries: 3
        });

        const teamProjectsParsed = TeamProjectsResponseSchema.parse(teamProjectsResponse.data);

        for (const project of teamProjectsParsed.projects) {
            // https://www.figma.com/developers/api#projects-endpoints
            const projectFilesResponse = await nango.get({
                endpoint: `/v1/projects/${encodeURIComponent(project.id)}/files`,
                retries: 3
            });

            const projectFilesParsed = ProjectFilesResponseSchema.parse(projectFilesResponse.data);

            for (const file of projectFilesParsed.files) {
                // https://www.figma.com/developers/api#variables-endpoints
                const variablesResponse = await nango.get({
                    endpoint: `/v1/files/${encodeURIComponent(file.key)}/variables/published`,
                    retries: 3
                });

                const variablesParsed = PublishedVariablesResponseSchema.parse(variablesResponse.data);

                const variables = Object.values(variablesParsed.meta.variables)
                    .filter((variable) => !updatedAfter || variable.updatedAt >= updatedAfter)
                    .map((variable) => ({
                        id: variable.id,
                        subscribed_id: variable.subscribed_id,
                        name: variable.name,
                        key: variable.key,
                        variableCollectionId: variable.variableCollectionId,
                        resolvedDataType: variable.resolvedDataType,
                        updatedAt: variable.updatedAt,
                        fileKey: file.key
                    }));

                if (variables.length > 0) {
                    await nango.batchSave(variables, 'Variable');
                }

                for (const variable of Object.values(variablesParsed.meta.variables)) {
                    if (!maxUpdatedAt || variable.updatedAt > maxUpdatedAt) {
                        maxUpdatedAt = variable.updatedAt;
                    }
                }

                if (maxUpdatedAt) {
                    await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
                }
            }
        }

        if (!maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: new Date().toISOString() });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
