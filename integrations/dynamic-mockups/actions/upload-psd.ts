import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    psd_file_url: z.string().describe('Publicly reachable direct URL to the PSD file. Example: "https://example.com/design.psd"'),
    psd_name: z.string().optional().describe('Optional display name for the uploaded PSD. Example: "Summer Campaign PSD"'),
    psd_category_id: z.number().optional().describe('Optional category ID. Defaults to 6 ("Other"). Example: 6'),
    mockup_template: z
        .object({
            create_after_upload: z.boolean().optional().describe('If true, creates a usable mockup template immediately after upload. Defaults to false.'),
            collections: z
                .array(z.string())
                .optional()
                .describe('Collection UUIDs to assign the new mockup to. Example: ["f035baed-db43-40d5-b260-cdc02458db93"]'),
            catalog_uuid: z.string().optional().describe('Catalog UUID to place the mockup in. Example: "6e228160-a9cc-4407-bfa9-464972545fdd"')
        })
        .optional()
});

const SmartObjectSchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        size: z.object({}).passthrough().optional(),
        position: z.object({}).passthrough().optional(),
        print_area_presets: z.array(z.unknown()).optional()
    })
    .passthrough();

const TextLayerSchema = z
    .object({
        uuid: z.string(),
        name: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    psd_uuid: z.string(),
    psd_name: z.string(),
    mockup_uuid: z.string().optional(),
    mockup_name: z.string().optional(),
    thumbnail: z.string().optional(),
    smart_objects: z.array(SmartObjectSchema).optional(),
    text_layers: z.array(TextLayerSchema).optional(),
    collections: z.array(z.unknown()).optional(),
    thumbnails: z.array(z.unknown()).optional()
});

const RawPsdOnlyResponseSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const RawMockupResponseSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    thumbnail: z.string().optional(),
    smart_objects: z.array(z.unknown()).optional(),
    text_layers: z.array(z.unknown()).optional(),
    collections: z.array(z.unknown()).optional(),
    thumbnails: z.array(z.unknown()).optional(),
    psd: z.object({
        uuid: z.string(),
        name: z.string()
    })
});

const action = createAction({
    description: 'Upload a Photoshop (.psd) file by URL, optionally creating a usable mockup template from it in the same call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            psd_file_url: input['psd_file_url']
        };

        if (input['psd_name'] !== undefined) {
            body['psd_name'] = input['psd_name'];
        }

        if (input['psd_category_id'] !== undefined) {
            body['psd_category_id'] = input['psd_category_id'];
        }

        if (input['mockup_template'] !== undefined) {
            const template = input['mockup_template'];
            body['mockup_template'] = {
                ...(template['create_after_upload'] !== undefined && {
                    create_after_upload: template['create_after_upload']
                }),
                ...(template['collections'] !== undefined && {
                    collections: template['collections']
                }),
                ...(template['catalog_uuid'] !== undefined && {
                    catalog_uuid: template['catalog_uuid']
                })
            };
        }

        const response = await nango.post({
            // https://docs.dynamicmockups.com/
            endpoint: '/v1/psd/upload',
            data: body,
            retries: 10
        });

        const WrapperSchema = z.object({
            data: z.unknown(),
            success: z.boolean().optional(),
            message: z.string().optional()
        });

        const wrapper = WrapperSchema.parse(response.data);
        const inner = wrapper.data;

        if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected non-object data field in upload-psd response.'
            });
        }

        if ('psd' in inner) {
            const mockup = RawMockupResponseSchema.parse(inner);

            return {
                psd_uuid: mockup.psd.uuid,
                psd_name: mockup.psd.name,
                mockup_uuid: mockup.uuid,
                mockup_name: mockup.name,
                ...(mockup.thumbnail !== undefined && { thumbnail: mockup.thumbnail }),
                ...(mockup.smart_objects !== undefined && {
                    smart_objects: mockup.smart_objects.map((so) => SmartObjectSchema.parse(so))
                }),
                ...(mockup.text_layers !== undefined && {
                    text_layers: mockup.text_layers.map((tl) => TextLayerSchema.parse(tl))
                }),
                ...(mockup.collections !== undefined && { collections: mockup.collections }),
                ...(mockup.thumbnails !== undefined && { thumbnails: mockup.thumbnails })
            };
        }

        const psdOnly = RawPsdOnlyResponseSchema.parse(inner);

        return {
            psd_uuid: psdOnly.uuid,
            psd_name: psdOnly.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
