import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    forms: z
        .union([
            z.object({
                count: z.number().optional(),
                href: z.string().optional()
            }),
            z.array(
                z.object({
                    count: z.number().optional(),
                    href: z.string().optional()
                })
            )
        ])
        .optional(),
    self: z
        .union([
            z.object({
                href: z.string().optional()
            }),
            z.array(
                z.object({
                    href: z.string().optional()
                })
            )
        ])
        .optional(),
    shared: z.boolean().optional()
});

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    shared: z.boolean().optional(),
    forms_count: z.number().optional(),
    forms_href: z.string().optional(),
    self_href: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync workspaces.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Workspace: WorkspaceSchema
    },
    scopes: ['workspaces:read'],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;

        // Blocker: GET /workspaces exposes page/page_size pagination, but no changed-since
        // filter or deleted-record feed. We therefore use a checkpointed full refresh and
        // only finish delete tracking after the full crawl succeeds.
        let nextPage: number | undefined = checkpoint?.page ?? 1;
        const isResumed = checkpoint != null && checkpoint.page > 1;
        let deleteTrackingStarted = isResumed;
        let receivedAnyPage = false;

        const ensureDeleteTrackingStarted = async () => {
            if (!deleteTrackingStarted) {
                await nango.trackDeletesStart('Workspace');
                deleteTrackingStarted = true;
            }
        };

        const proxyConfig: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/retrieve-workspaces/
            endpoint: '/workspaces',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const workspacePage of nango.paginate(proxyConfig)) {
            const workspaces = workspacePage.map((item: unknown) => {
                const parsed = ProviderWorkspaceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid workspace item: ${parsed.error.message}`);
                }
                const record = parsed.data;
                const forms = Array.isArray(record.forms) ? record.forms[0] : record.forms;
                const self = Array.isArray(record.self) ? record.self[0] : record.self;
                return {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.account_id != null && { account_id: record.account_id }),
                    ...(record.shared != null && { shared: record.shared }),
                    ...(forms?.count != null && { forms_count: forms.count }),
                    ...(forms?.href != null && { forms_href: forms.href }),
                    ...(self?.href != null && { self_href: self.href })
                };
            });

            receivedAnyPage = true;
            await ensureDeleteTrackingStarted();

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        if (!receivedAnyPage) {
            await ensureDeleteTrackingStarted();
        }
        await nango.trackDeletesEnd('Workspace');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
