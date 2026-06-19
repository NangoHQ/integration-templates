import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const AuthenticationSchemeSchema = z.object({
    name: z.string(),
    description: z.string(),
    specUri: z.string().optional(),
    documentationUri: z.string().optional(),
    type: z.string(),
    primary: z.boolean().optional()
});

const MetaSchema = z.object({
    location: z.string(),
    resourceType: z.string(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    version: z.string().optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()),
    documentationUri: z.string().optional(),
    patch: z.object({
        supported: z.boolean()
    }),
    bulk: z.object({
        supported: z.boolean(),
        maxOperations: z.number(),
        maxPayloadSize: z.number()
    }),
    filter: z.object({
        supported: z.boolean(),
        maxResults: z.number()
    }),
    changePassword: z.object({
        supported: z.boolean()
    }),
    sort: z.object({
        supported: z.boolean()
    }),
    etag: z.object({
        supported: z.boolean()
    }),
    authenticationSchemes: z.array(AuthenticationSchemeSchema),
    meta: MetaSchema.optional()
});

const action = createAction({
    description: 'Retrieve SCIM service provider capabilities.',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.1password.com/scim-endpoints/
        const response = await nango.get({
            endpoint: '/ServiceProviderConfig',
            retries: 3
        });

        const providerConfig = OutputSchema.parse(response.data);

        return providerConfig;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
