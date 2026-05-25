import { z } from 'zod';
import { createAction } from 'nango';

const ScimOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('replace'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('remove'), path: z.string(), value: z.unknown().optional() })
]);

const InputSchema = z.object({
    userId: z.string().describe('SCIM User ID. Example: "2819c223-7f76-453a-919d-413861904646"'),
    operations: z.array(ScimOperationSchema).describe('SCIM PatchOp operations. Example: [{"op":"replace","path":"userName","value":"new@example.com"}]')
});

const ScimNameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ScimEmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ScimMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderUserSchema = z.looseObject({
    schemas: z.array(z.string()),
    id: z.string(),
    userName: z.string().optional(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    preferredLanguage: z.string().optional(),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    meta: ScimMetaSchema.optional()
});

const OutputSchema = z.looseObject({
    schemas: z.array(z.string()),
    id: z.string(),
    userName: z.string().optional(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    preferredLanguage: z.string().optional(),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    meta: ScimMetaSchema.optional()
});

const action = createAction({
    description: 'Patch attributes for a 1Password SCIM user.',
    version: '1.1.0',
    endpoint: {
        method: 'POST',
        path: '/actions/patch-scim-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Users/${encodeURIComponent(input.userId)}`,
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: input.operations
            },
            retries: 3
        });

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                endpoint: `/Users/${encodeURIComponent(input.userId)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'User not found',
                    userId: input.userId
                });
            }
            rawData = getResponse.data;
        }

        const providerUser = ProviderUserSchema.parse(rawData);

        return providerUser;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
