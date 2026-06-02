import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    image_id: z.string().describe('Image ID of the creative asset. Example: "ad-site-i18n-sg/20260204c7c701257607f54b4b1d87df"')
});

const ProviderImageSchema = z.object({
    image_id: z.string(),
    file_name: z.string().optional(),
    format: z.string().optional(),
    image_url: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    signature: z.string().optional(),
    size: z.number().optional(),
    material_id: z.string().optional(),
    is_carousel_usable: z.boolean().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    displayable: z.boolean().optional()
});

const OutputSchema = z.object({
    image_id: z.string(),
    file_name: z.string().optional(),
    format: z.string().optional(),
    image_url: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    signature: z.string().optional(),
    size: z.number().optional(),
    material_id: z.string().optional(),
    is_carousel_usable: z.boolean().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    displayable: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single creative asset from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-creative-asset',
        group: 'Creatives'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1740051721711618
            endpoint: '/file/image/ad/info/',
            params: {
                advertiser_id: input.advertiser_id,
                image_ids: JSON.stringify([input.image_id])
            },
            retries: 3
        });

        const wrapperSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional(),
            request_id: z.string().optional(),
            data: z
                .object({
                    list: z.array(ProviderImageSchema).optional()
                })
                .optional()
        });

        const wrapper = wrapperSchema.parse(response.data);

        if (wrapper.code !== undefined && wrapper.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: wrapper.message || 'Unknown provider error',
                code: wrapper.code,
                request_id: wrapper.request_id
            });
        }

        const list = wrapper.data?.list;
        const asset = list?.find(() => true);
        if (!asset) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Creative asset not found',
                image_id: input.image_id
            });
        }
        return {
            image_id: asset.image_id,
            ...(asset.file_name !== undefined && { file_name: asset.file_name }),
            ...(asset.format !== undefined && { format: asset.format }),
            ...(asset.image_url !== undefined && { image_url: asset.image_url }),
            ...(asset.height !== undefined && { height: asset.height }),
            ...(asset.width !== undefined && { width: asset.width }),
            ...(asset.signature !== undefined && { signature: asset.signature }),
            ...(asset.size !== undefined && { size: asset.size }),
            ...(asset.material_id !== undefined && { material_id: asset.material_id }),
            ...(asset.is_carousel_usable !== undefined && { is_carousel_usable: asset.is_carousel_usable }),
            ...(asset.create_time !== undefined && { create_time: asset.create_time }),
            ...(asset.modify_time !== undefined && { modify_time: asset.modify_time }),
            ...(asset.displayable !== undefined && { displayable: asset.displayable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
