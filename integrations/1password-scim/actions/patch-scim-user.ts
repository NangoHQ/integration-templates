import { z } from 'zod';
import { createAction } from 'nango';

const ScimOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('replace'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('remove'), path: z.string(), value: z.unknown().optional() })
]);

const InputSchema = z.object({
    userId: z.string().describe('The SCIM user ID to patch. Example: "2819c223-7f76-453a-919d-413861904646"'),
    operations: z.array(ScimOperationSchema).describe('SCIM patch operations to apply.')
});

const ProviderEmailSchema = z.object({
    value: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ProviderNameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ProviderMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderUserSchema = z
    .object({
        schemas: z.array(z.string()).optional(),
        id: z.string().optional(),
        externalId: z.string().optional(),
        userName: z.string().optional(),
        name: ProviderNameSchema.optional(),
        displayName: z.string().optional(),
        emails: z.array(ProviderEmailSchema).optional(),
        active: z.boolean().optional(),
        meta: ProviderMetaSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    userName: z.string().optional(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
    name: z
        .object({
            formatted: z.string().optional(),
            familyName: z.string().optional(),
            givenName: z.string().optional()
        })
        .optional(),
    emails: z
        .array(
            z.object({
                value: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional(),
            version: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Patch attributes for a 1Password SCIM user.',
    version: '1.0.0',
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
            baseUrlOverride: 'https://provisioning.1password.com/scim',
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
                baseUrlOverride: 'https://provisioning.1password.com/scim',
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

        return {
            id: providerUser.id ?? '',
            ...(providerUser.userName !== undefined && { userName: providerUser.userName }),
            ...(providerUser.externalId !== undefined && { externalId: providerUser.externalId }),
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.name !== undefined && {
                name: {
                    ...(providerUser.name.formatted !== undefined && { formatted: providerUser.name.formatted }),
                    ...(providerUser.name.familyName !== undefined && { familyName: providerUser.name.familyName }),
                    ...(providerUser.name.givenName !== undefined && { givenName: providerUser.name.givenName })
                }
            }),
            ...(providerUser.emails !== undefined && {
                emails: providerUser.emails.map((email) => ({
                    ...(email.value !== undefined && { value: email.value }),
                    ...(email.type !== undefined && { type: email.type }),
                    ...(email.primary !== undefined && { primary: email.primary })
                }))
            }),
            ...(providerUser.meta !== undefined && {
                meta: {
                    ...(providerUser.meta.resourceType !== undefined && { resourceType: providerUser.meta.resourceType }),
                    ...(providerUser.meta.created !== undefined && { created: providerUser.meta.created }),
                    ...(providerUser.meta.lastModified !== undefined && { lastModified: providerUser.meta.lastModified }),
                    ...(providerUser.meta.location !== undefined && { location: providerUser.meta.location }),
                    ...(providerUser.meta.version !== undefined && { version: providerUser.meta.version })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
