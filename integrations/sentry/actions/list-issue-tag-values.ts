import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the issue belongs to. Example: "nangodev".'),
        issue_id: z.string().describe('The numeric ID of the issue to query (not the human-readable shortId). Example: "7761433968".'),
        key: z.string().describe('The tag key to look values up for. Example: "seed".')
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

const OutputSchema = z.array(TagValueSchema).describe('Distinct values seen for the given tag key on the issue.');

/**
 * @tags: [read]
 * @tagReason: Only performs a GET to read tag values from Sentry and never modifies provider data.
 * @pitfalls: Returns only the first page of tag values with no way to page further, and Sentry caps this endpoint at 1000 values even when paginating. An unknown issue ID or tag key fails with a 404 error rather than returning an empty list.
 */
const action = createAction({
    description: 'List the distinct values seen for one tag key on an issue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/events/list-a-tags-values-for-an-issue/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/tags/${encodeURIComponent(input.key)}/values/`,
            retries: 3
        });

        const tagValues = z.array(ProviderTagValueSchema).parse(response.data);

        return tagValues.map((tagValue) => ({
            key: tagValue.key,
            name: tagValue.name,
            ...(tagValue.value != null && { value: tagValue.value }),
            ...(tagValue.count != null && { count: tagValue.count }),
            ...(tagValue.firstSeen != null && { firstSeen: tagValue.firstSeen }),
            ...(tagValue.lastSeen != null && { lastSeen: tagValue.lastSeen })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
