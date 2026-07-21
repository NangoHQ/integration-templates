import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    settings: z
        .object({
            is_public: z.boolean().optional(),
            is_trial: z.boolean().optional()
        })
        .optional(),
    _links: z
        .object({
            display: z.string().optional(),
            responses: z.string().optional()
        })
        .optional(),
    self: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    theme: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    workspace: z
        .object({
            href: z.string().optional()
        })
        .optional()
});

const FormSchema = z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string(),
    last_updated_at: z.string(),
    settings: z
        .object({
            is_public: z.boolean().optional(),
            is_trial: z.boolean().optional()
        })
        .optional(),
    _links: z
        .object({
            display: z.string().optional(),
            responses: z.string().optional()
        })
        .optional(),
    self: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    theme: z
        .object({
            href: z.string().optional()
        })
        .optional(),
    workspace: z
        .object({
            href: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync forms.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Form: FormSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;

        // Blocker: GET /forms supports deterministic page pagination but no changed-since
        // filter or deleted-record feed. We therefore run a checkpointed full refresh and
        // only close delete tracking after the full crawl completes.
        let page: number | undefined = checkpoint?.page ?? 1;
        const isResumed = checkpoint != null && checkpoint.page > 1;

        if (!isResumed) {
            await nango.trackDeletesStart('Form');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/retrieve-forms/
            endpoint: '/forms',
            params: {
                sort_by: 'last_updated_at',
                order_by: 'asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            if (!Array.isArray(pageResults)) {
                throw new Error('Expected page results to be an array');
            }

            const parsed = z.array(ListItemSchema).safeParse(pageResults);
            if (!parsed.success) {
                throw new Error(`Failed to parse forms list page: ${parsed.error.message}`);
            }

            const forms = parsed.data.map((item) => ({
                id: item.id,
                title: item.title,
                created_at: item.created_at,
                last_updated_at: item.last_updated_at,
                ...(item.settings && {
                    settings: {
                        ...(item.settings.is_public !== undefined && { is_public: item.settings.is_public }),
                        ...(item.settings.is_trial !== undefined && { is_trial: item.settings.is_trial })
                    }
                }),
                ...(item._links && {
                    _links: {
                        ...(item._links.display !== undefined && { display: item._links.display }),
                        ...(item._links.responses !== undefined && { responses: item._links.responses })
                    }
                }),
                ...(item.self?.href !== undefined && {
                    self: { href: item.self.href }
                }),
                ...(item.theme?.href !== undefined && {
                    theme: { href: item.theme.href }
                }),
                ...(item.workspace?.href !== undefined && {
                    workspace: { href: item.workspace.href }
                })
            }));

            if (forms.length > 0) {
                await nango.batchSave(forms, 'Form');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.trackDeletesEnd('Form');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
