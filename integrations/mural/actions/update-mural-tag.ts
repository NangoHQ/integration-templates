import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the tag. Example: "nangodev4776.1791984276717".'),
        tagId: z.string().describe('Unique identifier of the tag to update. Example: "tag-1655472415437".'),
        text: z.string().max(25).optional().describe('New tag text, limited to 25 characters. Omit to leave the current text unchanged.'),
        backgroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{8}$/)
            .nullable()
            .optional()
            .describe('New tag background color as 8-digit hex with alpha, e.g. "#FAFAFAFF". Pass null to clear it; omit to leave it unchanged.'),
        borderColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{8}$/)
            .nullable()
            .optional()
            .describe('New tag border color as 8-digit hex with alpha, e.g. "#FAFAFAFF". Pass null to clear it; omit to leave it unchanged.'),
        color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{8}$/)
            .nullable()
            .optional()
            .describe('New tag text color as 8-digit hex with alpha, e.g. "#FAFAFAFF". Pass null to clear it; omit to leave it unchanged.')
    })
    .describe("Input for updating a Mural tag's text and/or colors.");

const ProviderTagSchema = z.object({
    id: z.string(),
    text: z.string(),
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    color: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderTagSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated tag.'),
        text: z.string().describe('The tag text after the update.'),
        backgroundColor: z.string().optional().describe('Tag background color as 8-digit hex with alpha, when set.'),
        borderColor: z.string().optional().describe('Tag border color as 8-digit hex with alpha, when set.'),
        color: z.string().optional().describe('Tag text color as 8-digit hex with alpha, when set.')
    })
    .describe('The updated Mural tag.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing mural tag's text and/or colors via a provider mutation; it never deletes or invalidates the tag itself.
 * @pitfalls: Tag text is capped at 25 characters (longer values fail with a 400 error); passing null for a color clears it, while omitting that color leaves it unchanged.
 */
const action = createAction({
    description: "Update a tag's text or color.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.mural.co/public/reference/updatetagbyid
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags/${encodeURIComponent(input.tagId)}`,
            data: {
                ...(input.text !== undefined && { text: input.text }),
                ...(input.backgroundColor !== undefined && { backgroundColor: input.backgroundColor }),
                ...(input.borderColor !== undefined && { borderColor: input.borderColor }),
                ...(input.color !== undefined && { color: input.color })
            },
            // Idempotent: sets the tag's text/colors to absolute values, so retrying after a lost response is safe.
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            id: parsed.value.id,
            text: parsed.value.text,
            ...(parsed.value.backgroundColor != null && { backgroundColor: parsed.value.backgroundColor }),
            ...(parsed.value.borderColor != null && { borderColor: parsed.value.borderColor }),
            ...(parsed.value.color != null && { color: parsed.value.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
