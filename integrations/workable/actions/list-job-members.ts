import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job shortcode. Example: "9CD658E13E"'),
    limit: z.number().optional().describe('Number of results per page. Max 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    headline: z.string().nullish(),
    email: z.string().nullish(),
    role: z.string().nullish(),
    collaboration_role: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    members: z.array(ProviderMemberSchema),
    paging: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const MemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    headline: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    collaboration_role: z.string().optional()
});

const OutputSchema = z.object({
    members: z.array(MemberSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List account members collaborating on a specific job',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { limit?: number; cursor?: string } = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/job-members
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/members`,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (providerData.paging?.next) {
            const nextUrl = new URL(providerData.paging.next);
            const cursorValue = nextUrl.searchParams.get('cursor');
            if (cursorValue) {
                nextCursor = cursorValue;
            }
        }

        const members = providerData.members.map((member) => ({
            id: member.id,
            name: member.name,
            ...(member.headline != null && { headline: member.headline }),
            ...(member.email != null && { email: member.email }),
            ...(member.role != null && { role: member.role }),
            ...(member.collaboration_role != null && { collaboration_role: member.collaboration_role })
        }));

        return {
            members,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
