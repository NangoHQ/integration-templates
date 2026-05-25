import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SupportedConfigSchema = z.object({
    supported: z.boolean().optional()
});

const BulkConfigSchema = z.object({
    supported: z.boolean().optional(),
    maxOperations: z.number().optional(),
    maxPayloadSize: z.number().optional()
});

const FilterConfigSchema = z.object({
    supported: z.boolean().optional(),
    maxResults: z.number().optional()
});

const AuthenticationSchemeSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    specUri: z.string().optional(),
    documentationUri: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderServiceProviderConfigSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string().optional(),
    meta: MetaSchema.optional(),
    documentationUri: z.string().optional(),
    patch: SupportedConfigSchema.optional(),
    bulk: BulkConfigSchema.optional(),
    filter: FilterConfigSchema.optional(),
    changePassword: SupportedConfigSchema.optional(),
    sort: SupportedConfigSchema.optional(),
    etag: SupportedConfigSchema.optional(),
    authenticationSchemes: z.array(AuthenticationSchemeSchema).optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string().optional(),
    meta: MetaSchema.optional(),
    documentationUri: z.string().optional(),
    patch: SupportedConfigSchema.optional(),
    bulk: BulkConfigSchema.optional(),
    filter: FilterConfigSchema.optional(),
    changePassword: SupportedConfigSchema.optional(),
    sort: SupportedConfigSchema.optional(),
    etag: SupportedConfigSchema.optional(),
    authenticationSchemes: z.array(AuthenticationSchemeSchema).optional()
});

const action = createAction({
    description: 'Retrieve SCIM service provider capabilities.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-service-provider-config',
        group: 'SCIM'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/ServiceProviderConfig',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Service provider config not found'
            });
        }

        const config = ProviderServiceProviderConfigSchema.parse(response.data);

        return {
            ...(config.schemas !== undefined && { schemas: config.schemas }),
            ...(config.id !== undefined && { id: config.id }),
            ...(config.meta !== undefined && { meta: config.meta }),
            ...(config.documentationUri !== undefined && { documentationUri: config.documentationUri }),
            ...(config.patch !== undefined && { patch: config.patch }),
            ...(config.bulk !== undefined && { bulk: config.bulk }),
            ...(config.filter !== undefined && { filter: config.filter }),
            ...(config.changePassword !== undefined && { changePassword: config.changePassword }),
            ...(config.sort !== undefined && { sort: config.sort }),
            ...(config.etag !== undefined && { etag: config.etag }),
            ...(config.authenticationSchemes !== undefined && { authenticationSchemes: config.authenticationSchemes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
