import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural. Example: "nangodev4776.1791984276717"')
    })
    .describe('Identifies the mural whose tags should be listed.');

const ProviderTagSchema = z.object({
    id: z.string(),
    text: z.string(),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    color: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderTagSchema)
});

const TagSchema = z.object({
    id: z.string().describe('Unique identifier of the tag. Example: "tag-1791996039907"'),
    text: z.string().describe('Display text of the tag. Example: "High Priority"'),
    backgroundColor: z.string().optional().describe('Tag background color in hex with alpha. Omitted when the tag uses the default background.'),
    borderColor: z.string().optional().describe('Tag border color in hex with alpha. Omitted when the tag uses the default border.'),
    color: z.string().optional().describe('Tag text color in hex with alpha. Omitted when the tag uses the default text color.')
});

const OutputSchema = z
    .object({
        tags: z.array(TagSchema).describe('Tags defined on the mural, empty when the mural has no tags.')
    })
    .describe('The tags configured on the requested mural.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the tags configured on a mural without modifying any provider state.
 * @pitfalls: A tag includes its background, border, and text color fields only when a custom color was set, and a mural with no tags returns an empty list rather than an error.
 */
const action = createAction({
    description: 'List the tags defined on a mural.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getmuraltags
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            tags: parsed.value.map((tag) => ({
                id: tag.id,
                text: tag.text,
                ...(tag.backgroundColor != null && { backgroundColor: tag.backgroundColor }),
                ...(tag.borderColor != null && { borderColor: tag.borderColor }),
                ...(tag.color != null && { color: tag.color })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
