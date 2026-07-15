import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ApiVersionSchema = z.object({
    handle: z.string(),
    displayName: z.string(),
    supported: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        publicApiVersions: z.array(ApiVersionSchema)
    })
});

const OutputSchema = z.object({
    versions: z.array(
        z.object({
            handle: z.string(),
            displayName: z.string(),
            supported: z.boolean()
        })
    )
});

const action = createAction({
    description: 'List the Partner API versions supported by this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/partner/latest/queries/publicApiVersions
            endpoint: '2026-07/graphql.json',
            data: {
                query: `
                    query {
                        publicApiVersions {
                            handle
                            displayName
                            supported
                        }
                    }
                `
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            versions: providerResponse.data.publicApiVersions.map((version) => ({
                handle: version.handle,
                displayName: version.displayName,
                supported: version.supported
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
