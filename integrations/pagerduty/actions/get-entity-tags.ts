import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entity_type: z
            .enum(['users', 'teams', 'escalation_policies'])
            .describe('The type of entity to fetch tags for. Must be one of users, teams, or escalation_policies.'),
        id: z.string().describe('The unique identifier of the entity.')
    })
    .describe('Input for fetching tags assigned to a user, team, or escalation policy.');

const ProviderTagSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    label: z.string()
});

const TagSchema = z.object({
    id: z.string().describe('The unique identifier of the tag.'),
    type: z.string().describe('The type of object. Always "tag" for tags.'),
    summary: z.string().optional().describe('A short-form, server-generated string that provides succinct information about the tag.'),
    self: z.string().optional().describe('The API show URL at which the tag is accessible.'),
    html_url: z.string().optional().describe('A URL at which the tag is uniquely displayed in the Web app.'),
    label: z.string().describe('The label of the tag.')
});

const OutputSchema = z
    .object({
        tags: z.array(TagSchema).describe('The list of tags assigned to the specified entity.')
    })
    .describe('Response containing the tags assigned to a user, team, or escalation policy.');

/**
 * @tags: [read]
 * @tagReason: Reads the tags assigned to a user, team, or escalation policy.
 * @pitfalls: The response omits all pagination metadata (limit, offset, more, total) and returns only a plain tags array, unlike the inverse get-tagged-entities endpoint.
 */
const action = createAction({
    description: 'List the tags assigned to a user, team, or escalation policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/tags/get-entity-type-by-id-tags
            endpoint: `/${encodeURIComponent(input.entity_type)}/${encodeURIComponent(input.id)}/tags`,
            retries: 3
        });

        const providerResponse = z
            .object({
                tags: z.array(ProviderTagSchema)
            })
            .parse(response.data);

        return {
            tags: providerResponse.tags.map((tag) => ({
                id: tag.id,
                type: tag.type,
                ...(tag.summary != null && { summary: tag.summary }),
                ...(tag.self != null && { self: tag.self }),
                ...(tag.html_url != null && { html_url: tag.html_url }),
                label: tag.label
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
