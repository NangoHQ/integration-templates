import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization the issue belongs to. Example: "nangodev"'),
        issue_id: z.string().describe('Numeric ID of the issue (group) to inspect. Example: "7761433968"'),
        key: z.string().describe('Tag key to look up on the issue. Example: "seed"')
    })
    .describe('Input for fetching aggregate details of one tag key on a Sentry issue');

const IssueTagTopValueSchema = z.object({
    key: z.string().describe('Tag key this value belongs to. Example: "seed"'),
    name: z.string().describe('Human-readable display name of the tag value. Example: "nango"'),
    value: z.string().describe('Raw tag value. Example: "nango"'),
    count: z.number().describe('Number of times this tag value occurs on the issue. Example: 1'),
    lastSeen: z.string().optional().describe('ISO 8601 timestamp when this tag value was last seen on the issue. Example: "2026-09-29T12:00:00.000Z"'),
    firstSeen: z.string().optional().describe('ISO 8601 timestamp when this tag value was first seen on the issue. Example: "2026-09-29T12:00:00.000Z"')
});

const OutputSchema = z
    .object({
        key: z.string().describe('The tag key that was looked up. Example: "seed"'),
        name: z.string().describe('Human-readable display name of the tag key. Example: "Seed"'),
        uniqueValues: z.number().describe('Number of distinct values observed for this tag key on the issue. Example: 1'),
        totalValues: z.number().describe('Total number of tag value occurrences for this tag key on the issue. Example: 1'),
        topValues: z.array(IssueTagTopValueSchema).describe('Top values for this tag key on the issue, most frequent first')
    })
    .describe('Aggregate details for a single tag key on a Sentry issue');

const ProviderTagValueSchema = z.object({
    key: z.string(),
    name: z.string(),
    value: z.string(),
    count: z.number(),
    lastSeen: z.string().nullable().optional(),
    firstSeen: z.string().nullable().optional()
});

const ProviderTagDetailsSchema = z.object({
    key: z.string(),
    name: z.string(),
    uniqueValues: z.number(),
    totalValues: z.number(),
    topValues: z.array(ProviderTagValueSchema)
});

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET to fetch aggregate details for one tag key on an issue.
 * @pitfalls: Sentry offers no endpoint to list an issue's tag keys, so the caller must already know the tag key (for example from an event payload). For high-cardinality tags the topValues list is truncated to at most 1000 values.
 */
const action = createAction({
    description: 'Get aggregate info for one tag key on an issue (unique/total value counts, top values).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.sentry.io/api/events/retrieve-tag-details/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/tags/${encodeURIComponent(input.key)}/`,
            retries: 3
        });

        const tag = ProviderTagDetailsSchema.parse(response.data);

        return {
            key: tag.key,
            name: tag.name,
            uniqueValues: tag.uniqueValues,
            totalValues: tag.totalValues,
            topValues: tag.topValues.map((value) => ({
                key: value.key,
                name: value.name,
                value: value.value,
                count: value.count,
                ...(value.lastSeen != null && { lastSeen: value.lastSeen }),
                ...(value.firstSeen != null && { firstSeen: value.firstSeen })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
