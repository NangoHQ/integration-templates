import { z } from 'zod';
import { createAction } from 'nango';

const TagAddSchema = z.object({
    type: z.enum(['tag_reference', 'tag']).describe("Use 'tag_reference' to add an existing tag by id, or 'tag' to create and add a new tag by label."),
    id: z.string().optional().describe('Tag id. Required when type is tag_reference.'),
    label: z.string().optional().describe('Tag label. Required when type is tag.')
});

const TagRemoveSchema = z.object({
    type: z.enum(['tag_reference']).describe("Tag reference type. Must be 'tag_reference'."),
    id: z.string().describe('Tag id to remove from the entity.')
});

const InputSchema = z
    .object({
        entity_type: z.enum(['users', 'teams', 'escalation_policies']).describe('Type of entity to tag. Must be users, teams, or escalation_policies.'),
        entity_id: z.string().describe('ID of the entity to tag.'),
        add: z.array(TagAddSchema).optional().describe('Tags to add to the entity.'),
        remove: z.array(TagRemoveSchema).optional().describe('Tags to remove from the entity.')
    })
    .describe('Input for assigning entity tags.');

const ProviderTagSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const TagOutputSchema = z.object({
    id: z.string().describe('Tag ID.'),
    type: z.string().describe('Tag type.'),
    summary: z.string().optional().describe('Tag label or summary.'),
    self: z.string().optional().describe('API URL for the tag.'),
    html_url: z.string().optional().describe('Web UI URL for the tag.')
});

const OutputSchema = z
    .object({
        tags: z.array(TagOutputSchema).describe('Current tags on the entity after the assignment.')
    })
    .describe('Output confirming the current tags on the entity.');

/**
 * @tags: [write]
 * @tagReason: Modifies tag assignments on a user, team, or escalation policy via the PagerDuty API.
 * @pitfalls: Because the provider returns only a bare ok string on success, this action re-fetches the tag list; if that re-fetch fails after a successful change, the action errors even though tags may have been modified.
 */
const action = createAction({
    description: 'Add and/or remove tags on a user, team, or escalation policy in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.add !== undefined) {
            body['add'] = input.add;
        }
        if (input.remove !== undefined) {
            body['remove'] = input.remove;
        }

        if (Object.keys(body).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of add or remove must be provided.'
            });
        }

        // https://developer.pagerduty.com/api-reference/
        await nango.post({
            endpoint: `/${encodeURIComponent(input.entity_type)}/${encodeURIComponent(input.entity_id)}/change_tags`,
            data: body,
            retries: 3
        });

        // https://developer.pagerduty.com/api-reference/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.entity_type)}/${encodeURIComponent(input.entity_id)}/tags`,
            retries: 3
        });

        const tagsResponse = z
            .object({
                tags: z.array(z.unknown())
            })
            .parse(response.data);

        const tags = tagsResponse.tags.map((tag: unknown) => {
            const providerTag = ProviderTagSchema.parse(tag);
            return {
                id: providerTag.id,
                type: providerTag.type,
                ...(providerTag.summary != null && { summary: providerTag.summary }),
                ...(providerTag.self != null && { self: providerTag.self }),
                ...(providerTag.html_url != null && { html_url: providerTag.html_url })
            };
        });

        return {
            tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
