import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    headline: z.unknown().nullish(),
    email: z.string(),
    roles: z.array(z.string()).optional(),
    active: z.boolean(),
    collaboration_rules: z.array(z.unknown()).optional()
});

const MemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    headline: z.string().optional(),
    email: z.string(),
    roles: z.array(z.string()).optional(),
    active: z.boolean(),
    collaboration_rules: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    next_page: z.string()
});

const sync = createSync({
    description: 'Sync account members.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Member: MemberSchema
    },

    exec: async (nango) => {
        // Blocker: /members has no updated_after/modified_since filter.
        // since_id only filters by ID order, not modification time,
        // so edits and deactivations of existing members would be missed.
        // A pagination checkpoint is used so an interrupted full refresh can resume.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { next_page: '' });
        let nextPage = checkpoint.next_page;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Member');

        const params: Record<string, string | number> = {
            status: 'all'
        };
        if (nextPage) {
            const nextUrl = new URL(nextPage);
            for (const [key, value] of nextUrl.searchParams.entries()) {
                params[key] = value;
            }
            if (!('limit' in params)) {
                params['limit'] = 100;
            }
        }

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/members.md
            endpoint: '/spi/v3/members',
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'members',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'string' && nextPageParam.length > 0 ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected members page to be an array');
            }

            const members = [];
            for (const raw of page) {
                const parsed = ProviderMemberSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse member: ${parsed.error.message}`);
                }

                const member = parsed.data;
                members.push({
                    id: member.id,
                    name: member.name,
                    ...(typeof member.headline === 'string' && member.headline.length > 0 && { headline: member.headline }),
                    email: member.email,
                    ...(member.roles && { roles: member.roles }),
                    active: member.active,
                    ...(member.collaboration_rules && { collaboration_rules: member.collaboration_rules })
                });
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'Member');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from page 1 next time instead of
            // resuming where it left off.
            if (nextPage !== '') {
                await nango.saveCheckpoint({ next_page: nextPage });
            }
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Member');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
