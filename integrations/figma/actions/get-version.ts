import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The file key for the Figma file. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    version_id: z.string().describe('The unique identifier for the version. Example: "2356506860085774014"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        handle: z.string(),
        img_url: z.string().nullish(),
        email: z.string().nullish()
    })
    .passthrough();

const ProviderVersionSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().nullish(),
    description: z.string().nullish(),
    user: ProviderUserSchema.nullish()
});

const ProviderVersionsResponseSchema = z.object({
    versions: z.array(ProviderVersionSchema),
    pagination: z
        .object({
            prev_page: z.string().optional(),
            next_page: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().optional(),
    description: z.string().optional(),
    user: z
        .object({
            id: z.string(),
            handle: z.string(),
            img_url: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single version from Figma.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_versions:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let params: Record<string, string> = {};

        do {
            // https://www.figma.com/developers/api#get-versions-endpoint
            const response = await nango.get({
                endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/versions`,
                params,
                retries: 3
            });

            const parsed = ProviderVersionsResponseSchema.parse(response.data);
            const version = parsed.versions.find((v) => v.id === input.version_id);

            if (version) {
                return {
                    id: version.id,
                    created_at: version.created_at,
                    ...(version.label != null && { label: version.label }),
                    ...(version.description != null && { description: version.description }),
                    ...(version.user != null && {
                        user: {
                            id: version.user.id,
                            handle: version.user.handle,
                            ...(version.user.img_url != null && { img_url: version.user.img_url }),
                            ...(version.user.email != null && { email: version.user.email })
                        }
                    })
                };
            }

            const prevPageUrl = parsed.pagination?.prev_page;
            if (!prevPageUrl) break;
            params = Object.fromEntries(new URL(prevPageUrl).searchParams.entries());
        } while (true);

        throw new nango.ActionError({
            type: 'not_found',
            message: `Version ${input.version_id} not found for file ${input.file_key}.`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
