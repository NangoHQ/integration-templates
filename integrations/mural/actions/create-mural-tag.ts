import { z } from 'zod';
import { createAction } from 'nango';

const ColorSchema = z
    .string()
    .regex(/^#[0-9A-Fa-f]{8}$/)
    .describe('Color in 8-digit hex with alpha, formatted as #RRGGBBAA. Example: "#FF0000FF"');

const WidgetSchema = z.object({
    id: z.string().describe('Unique identifier of the widget to attach the new tag to. Example: "0-1619509853818"'),
    fontSize: z.number().optional().describe('Font size used to render the tag on the widget. Example: 20')
});

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to create the tag in. Example: "workspace1234.1606743986126"'),
        text: z.string().max(25).describe('Text shown in the tag. Maximum 25 characters. Example: "High Priority"'),
        color: ColorSchema.optional().describe('Color of the tag text in #RRGGBBAA hex format. Omit to use the provider default.'),
        backgroundColor: ColorSchema.optional().describe('Background color of the tag in #RRGGBBAA hex format. Omit to use the provider default.'),
        borderColor: ColorSchema.optional().describe('Border color of the tag in #RRGGBBAA hex format. Omit to use the provider default.'),
        widgets: z.array(WidgetSchema).optional().describe('Widgets to attach the new tag to. Omit to create a tag that is not attached to any widget.')
    })
    .describe('Input for creating a new tag on a mural.');

const ProviderTagSchema = z.object({
    id: z.string(),
    text: z.string(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderTagSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created tag. Example: "tag-1655312720372"'),
        text: z.string().describe('Text of the created tag. Example: "High Priority"'),
        color: z.string().optional().describe('Color of the tag text in #RRGGBBAA hex format.'),
        backgroundColor: z.string().optional().describe('Background color of the tag in #RRGGBBAA hex format.'),
        borderColor: z.string().optional().describe('Border color of the tag in #RRGGBBAA hex format.')
    })
    .describe('The tag created on the mural.');

/**
 * @tags: [write]
 * @tagReason: Creates a new tag on a mural, mutating provider state.
 * @pitfalls: Each mural has a provider-enforced maximum number of tags, so creating one beyond that limit fails; lowercase hex colors are normalized to uppercase in the returned tag.
 */
const action = createAction({
    description: 'Create a new tag on a mural.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/createmuraltag
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags`,
            data: {
                text: input.text,
                ...(input.color !== undefined && { color: input.color }),
                ...(input.backgroundColor !== undefined && { backgroundColor: input.backgroundColor }),
                ...(input.borderColor !== undefined && { borderColor: input.borderColor }),
                ...(input.widgets !== undefined && { widgets: input.widgets })
            },
            // Non-idempotent create with no idempotency key: a retry after a lost response would create a duplicate tag.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const tag = parsed.value;

        return {
            id: tag.id,
            text: tag.text,
            ...(tag.color !== undefined && { color: tag.color }),
            ...(tag.backgroundColor !== undefined && { backgroundColor: tag.backgroundColor }),
            ...(tag.borderColor !== undefined && { borderColor: tag.borderColor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
