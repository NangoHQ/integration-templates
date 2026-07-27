import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    slug: z.string(),
    avatar: z.string().nullable(),
    createdAt: z.number(),
    creatorId: z.string().optional(),
    description: z.string().nullable().optional(),
    stagingPrefix: z.string().optional(),
    updatedAt: z.number().optional(),
    limited: z.boolean().optional(),
    limitedBy: z.string().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    slug: z.string(),
    avatar: z.string().optional(),
    createdAt: z.number(),
    creatorId: z.string().optional(),
    description: z.string().optional(),
    stagingPrefix: z.string().optional(),
    updatedAt: z.number().optional(),
    limited: z.boolean().optional(),
    limitedBy: z.string().optional()
});

const CheckpointSchema = z.object({
    next: z.number()
});

// `pagination` and `pagination.next` are required (next is nullable, not optional): Vercel
// signals "no more pages" via `next: null`, not by omitting the field or the whole object.
// If a response is missing pagination info entirely, parsing must fail loudly instead of
// silently being treated as the last page, which would close out trackDeletesEnd() based on
// an incomplete crawl.
const TeamListResponseSchema = z.object({
    teams: z.array(ProviderTeamSchema),
    pagination: z.object({
        next: z.number().nullable()
    })
});

const sync = createSync({
    description: 'Sync teams.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.next;

        // Blocker: /v2/teams has cursor pagination but no updated-since filter or
        // deleted-record feed. Keep the full snapshot strategy and use the cursor
        // only to resume interrupted crawls.

        await nango.trackDeletesStart('Team');

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/teams/list-all-teams
            endpoint: '/v2/teams',
            params: {
                limit: 100,
                ...(until !== undefined && { until })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'until',
                cursor_path_in_response: 'pagination.next',
                response_path: 'teams',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    // Validate the full raw response (not just the extracted `teams` page)
                    // so a malformed/truncated response missing `pagination` throws instead
                    // of silently being treated as "no more pages".
                    const parsedPage = TeamListResponseSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Failed to parse teams response: ${parsedPage.error.message}`);
                    }
                    until = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderTeamSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse teams response: ${parsed.error.message}`);
            }

            const teams = parsed.data.map((team) => ({
                id: team.id,
                ...(team.name != null && { name: team.name }),
                slug: team.slug,
                ...(team.avatar != null && { avatar: team.avatar }),
                createdAt: team.createdAt,
                ...(team.creatorId != null && { creatorId: team.creatorId }),
                ...(team.description != null && { description: team.description }),
                ...(team.stagingPrefix != null && { stagingPrefix: team.stagingPrefix }),
                ...(team.updatedAt != null && { updatedAt: team.updatedAt }),
                ...(team.limited != null && { limited: team.limited }),
                ...(team.limitedBy != null && { limitedBy: team.limitedBy })
            }));

            if (teams.length > 0) {
                await nango.batchSave(teams, 'Team');
            }

            if (until !== undefined) {
                await nango.saveCheckpoint({ next: until });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
