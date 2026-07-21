import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    section_order: z.number().int().optional(),
    is_archived: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    description: z.string().nullable().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().optional(),
    archived_at: z.string().nullable().optional(),
    user_id: z.string().optional(),
    goal_ids: z.array(z.string()).optional()
});

const SectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    section_order: z.number().int().optional(),
    is_archived: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    description: z.string().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().optional(),
    archived_at: z.string().optional(),
    user_id: z.string().optional(),
    goal_ids: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync sections.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Section: SectionSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v1/sections does not support any changed-since filter,
        // deleted-record endpoint, or resumable cursor. A full refresh with delete
        // tracking is required.
        await nango.trackDeletesStart('Section');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1/#get-all-sections
            endpoint: '/api/v1/sections',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const sections = [];
            for (const raw of page) {
                const parsed = ProviderSectionSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse section: ${parsed.error.message}`);
                }

                const provider = parsed.data;
                sections.push({
                    id: provider.id,
                    name: provider.name,
                    project_id: provider.project_id,
                    ...(provider.section_order !== undefined && { section_order: provider.section_order }),
                    ...(provider.is_archived !== undefined && { is_archived: provider.is_archived }),
                    ...(provider.is_collapsed !== undefined && { is_collapsed: provider.is_collapsed }),
                    ...(provider.is_deleted !== undefined && { is_deleted: provider.is_deleted }),
                    ...(provider.description != null && { description: provider.description }),
                    ...(provider.added_at !== undefined && { added_at: provider.added_at }),
                    ...(provider.updated_at !== undefined && { updated_at: provider.updated_at }),
                    ...(provider.archived_at != null && { archived_at: provider.archived_at }),
                    ...(provider.user_id !== undefined && { user_id: provider.user_id }),
                    ...(provider.goal_ids !== undefined && { goal_ids: provider.goal_ids })
                });
            }

            if (sections.length > 0) {
                await nango.batchSave(sections, 'Section');
            }
        }

        await nango.trackDeletesEnd('Section');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
