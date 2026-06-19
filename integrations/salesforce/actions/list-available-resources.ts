import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderVersionSchema = z.object({
    version: z.string(),
    label: z.string(),
    url: z.string()
});

const ProviderResponseSchema = z.array(ProviderVersionSchema);

const VersionSchema = z.object({
    version: z.string(),
    label: z.string(),
    url: z.string()
});

const OutputSchema = z.object({
    versions: z.array(VersionSchema)
});

const action = createAction({
    description: 'Discover supported Salesforce REST resource versions and root URLs.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm
        const response = await nango.get({
            endpoint: '/services/data',
            retries: 3
        });

        const versions = ProviderResponseSchema.parse(response.data);

        return {
            versions: versions.map((v) => ({
                version: v.version,
                label: v.label,
                url: v.url
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
