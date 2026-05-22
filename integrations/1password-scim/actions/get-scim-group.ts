import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('SCIM Group ID. Example: "e9e30dba-f08f-4109-8486-d5c6a331660a"')
});

const MemberSchema = z.object({
    value: z.string().describe('The ID of the SCIM resource'),
    display: z.string().optional(),
    $ref: z.string().optional(),
    type: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    displayName: z.string(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    displayName: z.string(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single SCIM group from 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scim'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.1password.com/scim-endpoints/
        const response = await nango.get({
            endpoint: '/Groups/' + encodeURIComponent(input.groupId),
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                groupId: input.groupId
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            schemas: providerGroup.schemas,
            id: providerGroup.id,
            displayName: providerGroup.displayName,
            ...(providerGroup.externalId !== undefined && { externalId: providerGroup.externalId }),
            ...(providerGroup.members !== undefined && { members: providerGroup.members }),
            ...(providerGroup.meta !== undefined && { meta: providerGroup.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
