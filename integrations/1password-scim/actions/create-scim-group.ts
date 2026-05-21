import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    displayName: z.string().describe('The display name of the SCIM group. Example: "Engineering"'),
    externalId: z.string().optional().describe('The external identifier for the group. Example: "group-123"'),
    members: z
        .array(
            z.object({
                value: z.string().describe('The identifier of the member. Example: "user-123"'),
                display: z.string().optional().describe('The display name of the member. Example: "John Doe"')
            })
        )
        .optional()
        .describe('Array of group members to assign on creation')
});

const ProviderMemberSchema = z.object({
    value: z.string(),
    display: z.string().optional(),
    $ref: z.string().optional(),
    type: z.string().optional()
});

const ProviderMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    displayName: z.string(),
    externalId: z.string().optional(),
    members: z.array(ProviderMemberSchema).optional(),
    meta: ProviderMetaSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    externalId: z.string().optional(),
    members: z
        .array(
            z.object({
                value: z.string(),
                display: z.string().optional()
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
    description: 'Create a SCIM group in 1Password SCIM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Groups'],

    exec: async (nango, input) => {
        const requestBody: Record<string, unknown> = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            displayName: input.displayName,
            ...(input.externalId !== undefined && { externalId: input.externalId }),
            ...(input.members !== undefined && {
                members: input.members.map((member) => ({
                    value: member.value,
                    ...(member.display !== undefined && { display: member.display })
                }))
            })
        };

        // https://support.1password.com/scim-endpoints/
        const response = await nango.post({
            endpoint: '/Groups',
            data: requestBody,
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            retries: 3
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            displayName: providerGroup.displayName,
            ...(providerGroup.externalId !== undefined && { externalId: providerGroup.externalId }),
            ...(providerGroup.members !== undefined && {
                members: providerGroup.members.map((member) => ({
                    value: member.value,
                    ...(member.display !== undefined && { display: member.display })
                }))
            }),
            ...(providerGroup.meta !== undefined && {
                meta: {
                    ...(providerGroup.meta.resourceType !== undefined && { resourceType: providerGroup.meta.resourceType }),
                    ...(providerGroup.meta.created !== undefined && { created: providerGroup.meta.created }),
                    ...(providerGroup.meta.lastModified !== undefined && { lastModified: providerGroup.meta.lastModified }),
                    ...(providerGroup.meta.location !== undefined && { location: providerGroup.meta.location }),
                    ...(providerGroup.meta.version !== undefined && { version: providerGroup.meta.version })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
