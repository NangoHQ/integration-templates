import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Segment ID. Example: "SRSEt8"')
});

const SegmentAttributesSchema = z.object({
    name: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    updated: z.string().nullable().optional(),
    is_active: z.boolean(),
    is_processing: z.boolean(),
    is_starred: z.boolean(),
    profile_count: z.number().nullable().optional()
});

const SegmentDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: SegmentAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: SegmentDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    is_active: z.boolean(),
    is_processing: z.boolean(),
    is_starred: z.boolean(),
    profile_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a segment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['segments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_segment
            endpoint: `/api/segments/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Segment with id '${input.id}' was not found.`
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response could not be parsed.',
                details: parsed.error.issues
            });
        }

        const segment = parsed.data.data;
        const attrs = segment.attributes;

        return {
            id: segment.id,
            ...(attrs.name != null && { name: attrs.name }),
            ...(attrs.created != null && { created: attrs.created }),
            ...(attrs.updated != null && { updated: attrs.updated }),
            is_active: attrs.is_active,
            is_processing: attrs.is_processing,
            is_starred: attrs.is_starred,
            ...(attrs.profile_count != null && { profile_count: attrs.profile_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
