import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTeamMemberSchema = z.object({
    id: z.string(),
    reference_id: z.string().nullish(),
    is_owner: z.boolean().nullish(),
    status: z.enum(['ACTIVE', 'INACTIVE']).nullish(),
    given_name: z.string().nullish(),
    family_name: z.string().nullish(),
    email_address: z.string().nullish(),
    phone_number: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const TeamMemberSchema = z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    is_owner: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync team members.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TeamMember: TeamMemberSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        let cursor = checkpoint.cursor || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/team-api/search-team-members
            endpoint: '/v2/team-members/search',
            method: 'POST',
            data: {
                ...(cursor && { cursor }),
                query: {
                    filter: {}
                },
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'team_members',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        // Full refresh: every team member still returned by Square is re-saved on every run.
        // Members that are hard-deleted from Square (not merely set to INACTIVE) simply stop
        // appearing in the search results, so trackDeletesStart/trackDeletesEnd is required to
        // detect and purge them from the destination. Only start tracking once the first page
        // has actually been fetched and validated, so a failure on the very first request (e.g.
        // an auth error) doesn't leave delete-tracking started with nothing enumerated.
        let deletesStarted = false;

        for await (const page of nango.paginate(proxyConfig)) {
            const saves: Array<z.infer<typeof TeamMemberSchema>> = [];
            const deletes: Array<{ id: string }> = [];

            for (const raw of page) {
                const parsed = ProviderTeamMemberSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse team member: ${parsed.error.message}`);
                }

                const member = parsed.data;
                if (!member.id) {
                    throw new Error('Team member missing id');
                }

                if (member.status === 'INACTIVE') {
                    deletes.push({ id: member.id });
                } else {
                    saves.push({
                        id: member.id,
                        ...(member.reference_id != null && { reference_id: member.reference_id }),
                        ...(member.is_owner != null && { is_owner: member.is_owner }),
                        ...(member.status != null && { status: member.status }),
                        ...(member.given_name != null && { given_name: member.given_name }),
                        ...(member.family_name != null && { family_name: member.family_name }),
                        ...(member.email_address != null && { email_address: member.email_address }),
                        ...(member.phone_number != null && { phone_number: member.phone_number }),
                        ...(member.created_at != null && { created_at: member.created_at }),
                        ...(member.updated_at != null && { updated_at: member.updated_at })
                    });
                }
            }

            // The page above parsed successfully, so enumeration is confirmed to proceed.
            // Start delete tracking now (only once, on the first page) rather than blindly at
            // the top of exec, so a failure on the very first request never leaves delete
            // tracking started with nothing enumerated.
            if (!deletesStarted) {
                await nango.trackDeletesStart('TeamMember');
                deletesStarted = true;
            }

            if (saves.length > 0) {
                await nango.batchSave(saves, 'TeamMember');
            }

            if (deletes.length > 0) {
                await nango.batchDelete(deletes, 'TeamMember');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();

        // Only finalize delete detection if enumeration actually started (and therefore ran to
        // completion above without throwing) — never on a partial/failed run, otherwise
        // not-yet-fetched members would be misidentified as deleted.
        if (deletesStarted) {
            await nango.trackDeletesEnd('TeamMember');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
