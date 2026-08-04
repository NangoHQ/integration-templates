import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    publicId: z.string().describe('The public ID of the Synthetic API test to retrieve. Example: "igg-8su-c9q"')
});

const CreatorSchema = z
    .object({
        name: z.string().optional(),
        handle: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ProviderTestSchema = z
    .object({
        public_id: z.string(),
        name: z.string(),
        type: z.string().optional(),
        subtype: z.string().optional(),
        status: z.string().optional(),
        config: z.object({}).passthrough().optional(),
        options: z.object({}).passthrough().optional(),
        message: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        locations: z.array(z.string()).optional(),
        creator: CreatorSchema.optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        public_id: z.string(),
        name: z.string(),
        type: z.string().optional(),
        subtype: z.string().optional(),
        status: z.string().optional(),
        config: z.object({}).passthrough().optional(),
        options: z.object({}).passthrough().optional(),
        message: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        locations: z.array(z.string()).optional(),
        creator: CreatorSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: "Get a single Synthetic API test's configuration.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/synthetics/#get-an-api-test
            endpoint: `v1/synthetics/tests/api/${encodeURIComponent(input.publicId)}`,
            retries: 3
        });

        const providerTest = ProviderTestSchema.parse(response.data);

        return {
            public_id: providerTest.public_id,
            name: providerTest.name,
            ...(providerTest.type !== undefined && { type: providerTest.type }),
            ...(providerTest.subtype !== undefined && { subtype: providerTest.subtype }),
            ...(providerTest.status !== undefined && { status: providerTest.status }),
            ...(providerTest.config !== undefined && { config: providerTest.config }),
            ...(providerTest.options !== undefined && { options: providerTest.options }),
            ...(providerTest.message !== undefined && { message: providerTest.message }),
            ...(providerTest.tags !== undefined && { tags: providerTest.tags }),
            ...(providerTest.created_at !== undefined && { created_at: providerTest.created_at }),
            ...(providerTest.modified_at !== undefined && { modified_at: providerTest.modified_at }),
            ...(providerTest.locations !== undefined && { locations: providerTest.locations }),
            ...(providerTest.creator !== undefined && { creator: providerTest.creator })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
