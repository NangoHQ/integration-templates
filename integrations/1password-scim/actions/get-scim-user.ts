import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The SCIM user ID. Example: "123"')
});

const ScimMetaSchema = z
    .object({
        resourceType: z.string().optional(),
        created: z.string().optional(),
        lastModified: z.string().optional(),
        location: z.string().optional(),
        version: z.string().optional()
    })
    .passthrough();

const ScimNameSchema = z
    .object({
        formatted: z.string().optional(),
        familyName: z.string().optional(),
        givenName: z.string().optional(),
        middleName: z.string().optional(),
        honorificPrefix: z.string().optional(),
        honorificSuffix: z.string().optional()
    })
    .passthrough();

const ScimEmailSchema = z
    .object({
        value: z.string(),
        display: z.string().optional(),
        type: z.string().optional(),
        primary: z.boolean().optional()
    })
    .passthrough();

const ScimGroupSchema = z
    .object({
        value: z.string(),
        display: z.string().optional(),
        type: z.string().optional(),
        $ref: z.string().optional()
    })
    .passthrough();

const ScimUserSchema = z
    .object({
        schemas: z.array(z.string()),
        id: z.string(),
        externalId: z.string().optional(),
        meta: ScimMetaSchema.optional(),
        userName: z.string(),
        name: ScimNameSchema.optional(),
        displayName: z.string().optional(),
        nickName: z.string().optional(),
        profileUrl: z.string().optional(),
        title: z.string().optional(),
        userType: z.string().optional(),
        preferredLanguage: z.string().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
        active: z.boolean().optional(),
        emails: z.array(ScimEmailSchema).optional(),
        groups: z.array(ScimGroupSchema).optional(),
        roles: z.array(z.object({}).passthrough()).optional(),
        entitlements: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = ScimUserSchema;

const action = createAction({
    description: 'Retrieve a single SCIM user from 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-scim-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Users/${encodeURIComponent(input.id)}`,
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                id: input.id
            });
        }

        const user = ScimUserSchema.parse(response.data);
        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
