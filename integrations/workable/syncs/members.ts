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

const sync = createSync({
    description: 'Sync account members.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Member: MemberSchema
    },

    exec: async (nango) => {
        // Blocker: /members has no updated_after/modified_since filter.
        // since_id only filters by ID order, not modification time,
        // so edits and deactivations of existing members would be missed.
        // Only start tracking once the first page has actually been fetched and validated, so a
        // failure on the very first request doesn't leave delete-tracking started with nothing
        // enumerated.
        let deletesStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/members.md
            endpoint: '/spi/v3/members',
            params: {
                status: 'all'
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'members',
                limit_name_in_request: 'limit',
                limit: 100
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

            // The page above parsed successfully, so enumeration is confirmed to proceed.
            if (!deletesStarted) {
                await nango.trackDeletesStart('Member');
                deletesStarted = true;
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'Member');
            }
        }

        if (deletesStarted) {
            await nango.trackDeletesEnd('Member');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
