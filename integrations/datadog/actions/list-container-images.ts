import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ContainerImageFlavorSchema = z.object({
    built_at: z.string().optional(),
    os_architecture: z.string().optional(),
    os_name: z.string().optional(),
    os_version: z.string().optional(),
    size: z.number().optional()
});

const ContainerImageVulnerabilitiesSchema = z.object({
    asset_id: z.string().optional(),
    critical: z.number().optional(),
    high: z.number().optional(),
    low: z.number().optional(),
    medium: z.number().optional(),
    none: z.number().optional(),
    unknown: z.number().optional()
});

const ContainerImageAttributesSchema = z.object({
    container_count: z.number().optional(),
    image_flavors: z.array(ContainerImageFlavorSchema).optional(),
    image_tags: z.array(z.string()).optional(),
    images_built_at: z.array(z.string()).optional(),
    name: z.string().optional(),
    os_architectures: z.array(z.string()).optional(),
    os_names: z.array(z.string()).optional(),
    os_versions: z.array(z.string()).optional(),
    published_at: z.string().optional(),
    registry: z.string().optional(),
    repo_digest: z.string().optional(),
    repository: z.string().optional(),
    short_image: z.string().optional(),
    sizes: z.array(z.number()).optional(),
    sources: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    vulnerability_count: ContainerImageVulnerabilitiesSchema.optional()
});

const ContainerImageItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ContainerImageAttributesSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ContainerImageItemSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ContainerImageItemSchema).optional(),
    meta: z
        .object({
            pagination: z
                .object({
                    next_cursor: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'List container images observed in this account, optionally enriched with security scan data.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/container-images/
            endpoint: 'v2/container_images',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.data || [],
            ...(providerResponse.meta?.pagination?.next_cursor !== undefined && {
                next_cursor: providerResponse.meta.pagination.next_cursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
