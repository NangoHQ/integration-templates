import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        label: z.string().describe('The label for the new tag.')
    })
    .describe('Input for creating a PagerDuty tag.');

const ProviderTagSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    label: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created tag.'),
        type: z.string().describe('The resource type.'),
        summary: z.string().optional().describe('A short summary of the tag.'),
        self: z.string().optional().describe('The API URL of the tag resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the tag.'),
        label: z.string().describe('The label of the created tag.')
    })
    .describe('Output of a created PagerDuty tag.');

/**
 * @tags: [write]
 * @tagReason: Creates a new tag in PagerDuty.
 */
const action = createAction({
    description: 'Create a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/cae453f7d1d6b-create-a-tag
            endpoint: '/tags',
            data: {
                tag: {
                    type: 'tag',
                    label: input.label
                }
            },
            retries: 3
        });

        const providerTag = ProviderTagSchema.parse(response.data.tag);

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
