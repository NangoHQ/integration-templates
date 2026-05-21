import { z } from 'zod';
import { createAction } from 'nango';

const ScimEmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ScimNameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ScimMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional()
});

const InputSchema = z.object({
    userName: z.string().describe('SCIM userName. Example: "user@example.com"'),
    externalId: z.string().optional().describe('External identifier for the user.'),
    displayName: z.string().optional().describe('Display name for the user.'),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    active: z.boolean().optional()
});

const ProviderUserSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    userName: z.string(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    active: z.boolean().optional(),
    meta: ScimMetaSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    userName: z.string(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    name: ScimNameSchema.optional(),
    emails: z.array(ScimEmailSchema).optional(),
    active: z.boolean().optional(),
    meta: ScimMetaSchema.optional()
});

const action = createAction({
    description: 'Create a SCIM user in 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-scim-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: input.userName,
            ...(input.externalId !== undefined && { externalId: input.externalId }),
            ...(input.displayName !== undefined && { displayName: input.displayName }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.emails !== undefined && { emails: input.emails }),
            ...(input.active !== undefined && { active: input.active })
        };

        const response = await nango.post({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Users',
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            data: payload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create SCIM user: empty response from provider.'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            userName: providerUser.userName,
            ...(providerUser.externalId !== undefined && { externalId: providerUser.externalId }),
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.emails !== undefined && { emails: providerUser.emails }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.meta !== undefined && { meta: providerUser.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
