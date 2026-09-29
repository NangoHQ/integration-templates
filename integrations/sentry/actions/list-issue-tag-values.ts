import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the issue belongs to. Example: "nangodev".'),
        issue_id: z.string().describe('The numeric ID of the issue to query (not the human-readable shortId). Example: "7761433968".'),
        key: z.string().describe('The tag key to look values up for. Example: "seed".'),
        cursor: z
            .string()
            .regex(/^-?\d+(?:\.\d+)?:-?\d+:-?\d+$/)
            .optional()
            .describe('Pagination cursor from the nextCursor of a previous response, e.g. "1700000000000:1:0". Omit for the first page.')
    })
    .describe('Input for listing the distinct values of one tag key on a Sentry issue.');

const ProviderTagValueSchema = z.object({
    key: z.string(),
    name: z.string(),
    value: z.string().nullable(),
    count: z.number().nullable(),
    lastSeen: z.string().nullable(),
    firstSeen: z.string().nullable()
});

const TagValueSchema = z.object({
    key: z.string().describe('The tag key the value belongs to. Example: "seed".'),
    name: z.string().describe('Human-readable name of the tag value. Example: "Nango".'),
    value: z.string().optional().describe('The raw tag value. Example: "nango".'),
    count: z.number().optional().describe('Number of events on the issue that carry this tag value.'),
    firstSeen: z.string().optional().describe('ISO 8601 timestamp of when this tag value was first seen on the issue. Example: "2026-09-29T12:00:00Z".'),
    lastSeen: z.string().optional().describe('ISO 8601 timestamp of when this tag value was most recently seen on the issue. Example: "2026-09-29T12:00:00Z".')
});

const OutputSchema = z
    .object({
        values: z.array(TagValueSchema).describe('Distinct values seen for the given tag key on the issue.'),
        nextCursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor for the next page, taken from the Link response header. Absent when there are no more results; pass it back as the cursor input.'
            )
    })
    .describe('A page of distinct values seen for the given tag key on the issue, with an optional cursor to fetch the next page.');

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
    if (!nextLink || !/results="true"/.test(nextLink)) {
        return undefined;
    }
    const cursorMatch = /cursor="([^"]+)"/.exec(nextLink);
    return cursorMatch?.[1];
}

/**
 * @tags: [read]
 * @tagReason: Only performs a GET to read tag values from Sentry and never modifies provider data.
 * @pitfalls: Sentry caps this endpoint at 1000 values even when paginating through every page. An unknown issue ID or tag key fails with a 404 error rather than returning an empty list.
 */
const action = createAction({
    description: 'List the distinct values seen for one tag key on an issue, with cursor pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/events/list-a-tags-values-for-an-issue/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/tags/${encodeURIComponent(input.key)}/values/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const tagValues = z.array(ProviderTagValueSchema).parse(response.data);

        const parsedHeaders = z.object({ link: z.string().optional() }).safeParse(response.headers);
        const nextCursor = parsedHeaders.success ? parseNextCursor(parsedHeaders.data.link) : undefined;

        const values = tagValues.map((tagValue) => ({
            key: tagValue.key,
            name: tagValue.name,
            ...(tagValue.value != null && { value: tagValue.value }),
            ...(tagValue.count != null && { count: tagValue.count }),
            ...(tagValue.firstSeen != null && { firstSeen: tagValue.firstSeen }),
            ...(tagValue.lastSeen != null && { lastSeen: tagValue.lastSeen })
        }));

        return {
            values,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
