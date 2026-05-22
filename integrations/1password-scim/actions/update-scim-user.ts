import { z } from 'zod';
import { createAction } from 'nango';

const ScimOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('replace'), path: z.string().optional(), value: z.unknown().optional() }),
    z.object({ op: z.literal('remove'), path: z.string(), value: z.unknown().optional() })
]);

const InputSchema = z.object({
    id: z.string().describe('SCIM user ID. Example: "2819c223-7f76-453a-919d-413861904646"'),
    operations: z.array(ScimOperationSchema).min(1).describe('Array of SCIM PatchOp operations to apply')
});

const ScimMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ScimNameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional(),
    middleName: z.string().optional(),
    honorificPrefix: z.string().optional(),
    honorificSuffix: z.string().optional()
});

const ScimEmailSchema = z.object({
    value: z.string().optional(),
    display: z.string().optional(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ScimUserSchema = z
    .object({
        id: z.string(),
        externalId: z.string().optional(),
        meta: ScimMetaSchema.optional(),
        schemas: z.array(z.string()).optional(),
        userName: z.string().optional(),
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
        emails: z.array(ScimEmailSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    externalId: z.string().optional(),
    meta: ScimMetaSchema.optional(),
    schemas: z.array(z.string()).optional(),
    userName: z.string().optional(),
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
    emails: z.array(ScimEmailSchema).optional()
});

const action = createAction({
    description: 'Update a SCIM user in 1Password SCIM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-scim-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scim'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody = {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: input.operations
        };

        const response = await nango.patch({
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Users/${encodeURIComponent(input.id)}`,
            data: patchBody,
            retries: 3
        });

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                endpoint: `/Users/${encodeURIComponent(input.id)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'User not found',
                    id: input.id
                });
            }
            rawData = getResponse.data;
        }

        const providerUser = ScimUserSchema.parse(rawData);

        return {
            id: providerUser.id,
            ...(providerUser.externalId !== undefined && { externalId: providerUser.externalId }),
            ...(providerUser.meta !== undefined && { meta: providerUser.meta }),
            ...(providerUser.schemas !== undefined && { schemas: providerUser.schemas }),
            ...(providerUser.userName !== undefined && { userName: providerUser.userName }),
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            ...(providerUser.nickName !== undefined && { nickName: providerUser.nickName }),
            ...(providerUser.profileUrl !== undefined && { profileUrl: providerUser.profileUrl }),
            ...(providerUser.title !== undefined && { title: providerUser.title }),
            ...(providerUser.userType !== undefined && { userType: providerUser.userType }),
            ...(providerUser.preferredLanguage !== undefined && { preferredLanguage: providerUser.preferredLanguage }),
            ...(providerUser.locale !== undefined && { locale: providerUser.locale }),
            ...(providerUser.timezone !== undefined && { timezone: providerUser.timezone }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.emails !== undefined && { emails: providerUser.emails })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
