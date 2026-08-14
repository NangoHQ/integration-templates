import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('Mockup UUID. Example: "fa4ffaad-cef5-4205-99c7-cb03f73f0118"')
});

const ThumbnailSchema = z.object({
    width: z.number(),
    url: z.string()
});

const PrintAreaPresetSchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        thumbnails: z.array(ThumbnailSchema)
    })
    .passthrough();

const SmartObjectSchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        size: z
            .object({
                width: z.number(),
                height: z.number()
            })
            .optional(),
        position: z
            .object({
                top: z.number(),
                left: z.number()
            })
            .optional(),
        print_area_presets: z.array(PrintAreaPresetSchema).optional()
    })
    .passthrough();

const TextLayerSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const CollectionSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const OutputSchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        thumbnail: z.string(),
        smart_objects: z.array(SmartObjectSchema).optional(),
        text_layers: z.array(TextLayerSchema).optional(),
        collections: z.array(CollectionSchema).optional(),
        thumbnails: z.array(ThumbnailSchema).optional()
    })
    .passthrough();

const GetMockupResponseSchema = z.object({
    data: OutputSchema,
    success: z.boolean(),
    message: z.string()
});

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Get a single mockup template by uuid.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Map provider 404 to a typed ActionError so callers receive a clean not-found message instead of a raw Axios error.
        try {
            const response = await nango.get({
                // https://docs.dynamicmockups.com/api-reference/get-mockups-api#get-mockup-uuid
                endpoint: `v1/mockup/${encodeURIComponent(input.uuid)}`,
                retries: 3
            });

            const envelope = GetMockupResponseSchema.parse(response.data);
            return envelope.data;
        } catch (error) {
            const parsed = AxiosErrorSchema.safeParse(error);
            if (parsed.success && parsed.data.response?.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Mockup with provided uuid not found.'
                });
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
