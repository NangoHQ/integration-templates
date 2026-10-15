import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the tag. Example: "workspace1234.1606743986126"'),
        tagId: z.string().describe('Unique identifier of the tag to retrieve. Example: "tag-1655312720372"')
    })
    .describe('Identifies the tag to retrieve and the mural it belongs to.');

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
        id: z.string().describe('Unique identifier of the tag. Example: "tag-1655312720372"'),
        text: z.string().describe('Text displayed in the tag. Example: "High Priority"'),
        backgroundColor: z.string().optional().describe('Background color of the tag in 8-digit hex with alpha format. Example: "#FAFAFAFF"'),
        borderColor: z.string().optional().describe('Border color of the tag in 8-digit hex with alpha format. Example: "#FAFAFAFF"'),
        color: z.string().optional().describe('Text color of the tag in 8-digit hex with alpha format. Example: "#FAFAFAFF"')
    })
    .describe('A single tag on a mural.');

function getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return undefined;
    }
    const status = response.status;
    return typeof status === 'number' ? status : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads a single existing tag from a mural without modifying any provider data.
 */
const action = createAction({
    description: 'Retrieve a single tag from a mural by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let responseData: unknown;
        // @allowTryCatch - translate the documented 404 (TAG_NOT_FOUND / MURAL_NOT_FOUND) into a typed ActionError.
        try {
            // https://developers.mural.co/public/reference/getmuraltag
            const response = await nango.get({
                endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags/${encodeURIComponent(input.tagId)}`,
                retries: 3
            });
            responseData = response.data;
        } catch (error) {
            if (getErrorStatus(error) === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Tag "${input.tagId}" was not found in mural "${input.muralId}".`,
                    muralId: input.muralId,
                    tagId: input.tagId
                });
            }
            throw error;
        }

        const providerTag = ProviderResponseSchema.parse(responseData).value;

        return {
            id: providerTag.id,
            text: providerTag.text,
            ...(providerTag.backgroundColor != null && { backgroundColor: providerTag.backgroundColor }),
            ...(providerTag.borderColor != null && { borderColor: providerTag.borderColor }),
            ...(providerTag.color != null && { color: providerTag.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
