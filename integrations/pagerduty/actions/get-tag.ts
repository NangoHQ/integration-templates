import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the tag.')
    })
    .describe('Input for retrieving a PagerDuty tag by its ID.');

const TagSchema = z.object({
    id: z.string().describe('The unique identifier of the tag.'),
    type: z.string().describe('The type of object. Always "tag" for tags.'),
    summary: z.string().nullable().optional().describe('A short-form, server-generated string that provides succinct information about the tag.'),
    self: z.string().nullable().optional().describe('The API show URL at which the object is accessible.'),
    html_url: z.string().nullable().optional().describe('A URL at which the entity is uniquely displayed in the PagerDuty web app.'),
    label: z.string().describe('The label of the tag.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the tag.'),
        type: z.string().describe('The type of object. Always "tag" for tags.'),
        summary: z.string().optional().describe('A short-form, server-generated string that provides succinct information about the tag.'),
        self: z.string().optional().describe('The API show URL at which the object is accessible.'),
        html_url: z.string().optional().describe('A URL at which the entity is uniquely displayed in the PagerDuty web app.'),
        label: z.string().describe('The label of the tag.')
    })
    .describe('A PagerDuty tag object.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single tag by its ID.
 */
const action = createAction({
    description: 'Retrieve a single tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/c4c0e0f4d13f1-get-a-tag
            endpoint: `/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerTag = TagSchema.parse(response.data.tag);

        return {
            id: providerTag.id,
            type: providerTag.type,
            ...(providerTag.summary != null && { summary: providerTag.summary }),
            ...(providerTag.self != null && { self: providerTag.self }),
            ...(providerTag.html_url != null && { html_url: providerTag.html_url }),
            label: providerTag.label
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
