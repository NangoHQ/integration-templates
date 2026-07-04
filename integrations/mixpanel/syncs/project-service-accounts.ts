import { createSync } from 'nango';
import { z } from 'zod';

const ProjectSchema = z
    .object({
        id: z.union([z.string(), z.number()])
    })
    .passthrough();

const MeResponseSchema = z
    .object({
        status: z.string().optional(),
        results: z
            .object({
                projects: z.record(z.string(), ProjectSchema).optional(),
                workspaces: z.record(z.string(), z.object({ id: z.union([z.string(), z.number()]).optional() }).passthrough()).optional()
            })
            .passthrough()
            .optional(),
        projects: z.record(z.string(), ProjectSchema).optional()
    })
    .passthrough();

const AccountsResponseSchema = z
    .object({
        results: z.array(z.unknown()).optional(),
        status: z.string().optional()
    })
    .passthrough();

const ProviderServiceAccountSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        username: z.string().nullish(),
        last_used: z.string().nullish(),
        expires: z.string().nullish(),
        creator: z.union([z.string(), z.number()]).nullish(),
        created: z.string().nullish(),
        user: z.union([z.string(), z.number()]).nullish(),
        hasSensitiveAccess: z.boolean().nullish(),
        role: z.string().nullish(),
        role_order: z.union([z.string(), z.number()]).nullish(),
        target_type: z.string().nullish(),
        email: z.string().nullish()
    })
    .passthrough();

const ProjectServiceAccountSchema = z.object({
    id: z.string(),
    service_account_id: z.string(),
    project_id: z.string(),
    username: z.string().optional(),
    last_used: z.string().optional(),
    expires: z.string().optional(),
    creator: z.number().optional(),
    created: z.string().optional(),
    user: z.number().optional(),
    hasSensitiveAccess: z.boolean().optional(),
    role: z.string().optional(),
    role_order: z.number().optional(),
    target_type: z.string().optional(),
    email: z.string().optional()
});

const CheckpointSchema = z.object({
    next_project_id: z.string()
});

const sync = createSync({
    description: 'Sync project service account memberships',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ProjectServiceAccount: ProjectServiceAccountSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint: z.infer<typeof CheckpointSchema> = checkpointParse.success ? checkpointParse.data : { next_project_id: '' };

        // https://developer.mixpanel.com/reference/overview
        const meResponse = await nango.get({
            endpoint: '/api/app/me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const projectIds = [
            ...new Set(
                (meData.results?.projects ? Object.values(meData.results.projects) : meData.projects ? Object.values(meData.projects) : []).map((project) =>
                    String(project.id)
                )
            )
        ].sort();

        await nango.trackDeletesStart('ProjectServiceAccount');

        const checkpointIndex = checkpoint.next_project_id ? projectIds.indexOf(checkpoint.next_project_id) : 0;
        const startIndex = checkpointIndex >= 0 ? checkpointIndex : 0;

        for (let index = startIndex; index < projectIds.length; index++) {
            const projectId = projectIds[index];
            if (!projectId) {
                continue;
            }

            // https://developer.mixpanel.com/reference/list-project-service-accounts
            const accountsResponse = await nango.get({
                endpoint: `/api/app/projects/${encodeURIComponent(projectId)}/service-accounts`,
                retries: 3
            });

            const parsedAccounts = AccountsResponseSchema.parse(accountsResponse.data);
            const rawAccounts = parsedAccounts.results ?? [];

            const records = rawAccounts.map((raw) => {
                const account = ProviderServiceAccountSchema.parse(raw);
                const serviceAccountId = String(account.id);
                return {
                    id: `${serviceAccountId}/${projectId}`,
                    service_account_id: serviceAccountId,
                    project_id: projectId,
                    ...(account.username != null && { username: account.username }),
                    ...(account.last_used != null && { last_used: account.last_used }),
                    ...(account.expires != null && { expires: account.expires }),
                    ...(account.creator != null && { creator: Number(account.creator) }),
                    ...(account.created != null && { created: account.created }),
                    ...(account.user != null && { user: Number(account.user) }),
                    ...(account.hasSensitiveAccess != null && {
                        hasSensitiveAccess: account.hasSensitiveAccess
                    }),
                    ...(account.role != null && { role: account.role }),
                    ...(account.role_order != null && { role_order: Number(account.role_order) }),
                    ...(account.target_type != null && { target_type: account.target_type }),
                    ...(account.email != null && { email: account.email })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'ProjectServiceAccount');
            }

            const nextProjectId = projectIds[index + 1];
            if (nextProjectId) {
                await nango.saveCheckpoint({ next_project_id: nextProjectId });
            }
        }

        await nango.trackDeletesEnd('ProjectServiceAccount');

        await nango.saveCheckpoint({ next_project_id: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
