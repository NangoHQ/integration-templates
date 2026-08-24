import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ApplicationUserSchema = z.object({
    id: z.string(),
    app_id: z.string(),
    user_id: z.string(),
    external_id: z.string().optional(),
    created: z.string().optional(),
    last_updated: z.string().optional(),
    scope: z.string().optional(),
    status: z.string().optional(),
    status_changed: z.string().optional(),
    sync_state: z.string().optional(),
    last_sync: z.string().optional(),
    credentials_user_name: z.string().optional()
});

const AppSchema = z.object({
    id: z.string()
});

const AppUserSchema = z.object({
    id: z.string(),
    externalId: z.string().nullable().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    scope: z.string().optional(),
    status: z.string().optional(),
    statusChanged: z.string().optional(),
    syncState: z.string().optional(),
    lastSync: z.string().optional(),
    credentials: z
        .object({
            userName: z.string().optional()
        })
        .nullable()
        .optional()
});

const CheckpointSchema = z.object({
    app_id: z.string(),
    next_link: z.string()
});

const StoredCheckpointSchema = z.object({
    app_id: z.string().optional(),
    next_link: z.string().optional()
});

const sync = createSync({
    description: 'Sync application assignments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ApplicationUser: ApplicationUserSchema
    },
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});
        const resumeAppId = checkpoint.app_id;
        const resumeNextLink = checkpoint.next_link;

        const appsConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application/other/listapplications.md
            endpoint: '/api/v1/apps',
            params: {
                limit: 200,
                includeNonDeleted: 'true'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        };

        const apps: Array<{ id: string }> = [];
        for await (const page of nango.paginate(appsConfig)) {
            for (const rawApp of page) {
                const appResult = AppSchema.safeParse(rawApp);
                if (!appResult.success) {
                    throw new Error(`Failed to parse application: ${appResult.error.message}`);
                }
                apps.push(appResult.data);
            }
        }

        let startIndex = 0;
        if (resumeAppId) {
            const idx = apps.findIndex((app) => app.id === resumeAppId);
            if (idx !== -1) {
                startIndex = idx;
            }
        }

        await nango.trackDeletesStart('ApplicationUser');

        for (let i = startIndex; i < apps.length; i++) {
            const app = apps[i];
            if (!app) {
                continue;
            }

            let nextLink: string | undefined;
            const isResuming = i === startIndex && resumeNextLink != null;

            let usersEndpoint: string;
            if (isResuming) {
                const url = new URL(resumeNextLink!);
                usersEndpoint = url.pathname + url.search;
            } else {
                usersEndpoint = `/api/v1/apps/${encodeURIComponent(app.id)}/users`;
            }

            const usersConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/applicationusers/other/listapplicationusers
                endpoint: usersEndpoint,
                ...(isResuming
                    ? {}
                    : {
                          params: {
                              limit: 500
                          }
                      }),
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 500,
                    on_page: async ({ nextPageParam }) => {
                        nextLink = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(usersConfig)) {
                const appUsers: Array<z.infer<typeof ApplicationUserSchema>> = [];
                for (const rawUser of page) {
                    const userResult = AppUserSchema.safeParse(rawUser);
                    if (!userResult.success) {
                        throw new Error(`Failed to parse app user for app ${app.id}: ${userResult.error.message}`);
                    }
                    const user = userResult.data;
                    appUsers.push({
                        id: `${app.id}_${user.id}`,
                        app_id: app.id,
                        user_id: user.id,
                        ...(user.externalId != null && { external_id: user.externalId }),
                        ...(user.created != null && { created: user.created }),
                        ...(user.lastUpdated != null && { last_updated: user.lastUpdated }),
                        ...(user.scope != null && { scope: user.scope }),
                        ...(user.status != null && { status: user.status }),
                        ...(user.statusChanged != null && { status_changed: user.statusChanged }),
                        ...(user.syncState != null && { sync_state: user.syncState }),
                        ...(user.lastSync != null && { last_sync: user.lastSync }),
                        ...(user.credentials?.userName != null && { credentials_user_name: user.credentials.userName })
                    });
                }

                if (appUsers.length > 0) {
                    await nango.batchSave(appUsers, 'ApplicationUser');
                }

                if (nextLink !== undefined) {
                    await nango.saveCheckpoint({ app_id: app.id, next_link: nextLink });
                }
            }

            const nextApp = apps[i + 1];
            if (nextApp) {
                await nango.saveCheckpoint({ app_id: nextApp.id, next_link: '' });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ApplicationUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
