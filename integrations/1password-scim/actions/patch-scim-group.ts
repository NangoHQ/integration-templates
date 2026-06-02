import { z } from 'zod';
import { createAction } from 'nango';

const ScimMemberSchema = z.object({
    value: z.string().describe('User ID. Example: "2819c223-7f76-453a-919d-413861904646"'),
    display: z.string().optional(),
    $ref: z.string().optional()
});

const ScimOperationSchema = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('add'),
        path: z.string().optional().describe('Target attribute path. Example: "members" or "displayName"'),
        value: z.union([z.string(), z.array(ScimMemberSchema), z.record(z.string(), z.unknown())]).optional()
    }),
    z.object({
        op: z.literal('replace'),
        path: z.string().optional().describe('Target attribute path. Example: "members" or "displayName"'),
        value: z.union([z.string(), z.array(ScimMemberSchema), z.record(z.string(), z.unknown())]).optional()
    }),
    z.object({
        op: z.literal('remove'),
        path: z.string().describe('Target attribute path. Example: "members" or "displayName"'),
        value: z.union([z.string(), z.array(ScimMemberSchema), z.record(z.string(), z.unknown())]).optional()
    })
]);

const InputSchema = z.object({
    id: z.string().describe('SCIM Group ID. Example: "9067729b3d-f987ac4d-a175-44f0-a528-6d23c5d2ec4d"'),
    operations: z.array(ScimOperationSchema).describe('SCIM patch operations to apply to the group.')
});

const ScimGroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    displayName: z.string().optional(),
    members: z.array(ScimMemberSchema).optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional(),
            version: z.string().optional()
        })
        .optional(),
    externalId: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
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
        .optional(),
    externalId: z.string().optional()
});

const action = createAction({
    description: 'Patch attributes or membership for a 1Password SCIM group.',
    version: '1.1.0',
    endpoint: {
        method: 'POST',
        path: '/actions/patch-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: input.operations
        };

        // https://support.1password.com/scim-endpoints/
        const response = await nango.patch({
            endpoint: `/Groups/${encodeURIComponent(input.id)}`,
            data: requestBody,
            retries: 3
        });

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                endpoint: `/Groups/${encodeURIComponent(input.id)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Group not found',
                    id: input.id
                });
            }
            rawData = getResponse.data;
        }

        const providerGroup = ScimGroupSchema.parse(rawData);

        return {
            id: providerGroup.id,
            ...(providerGroup.displayName !== undefined && { displayName: providerGroup.displayName }),
            ...(providerGroup.members !== undefined && {
                members: providerGroup.members.map((member) => ({
                    value: member.value,
                    ...(member.display !== undefined && { display: member.display })
                }))
            }),
            ...(providerGroup.meta !== undefined && { meta: providerGroup.meta }),
            ...(providerGroup.externalId != null && { externalId: providerGroup.externalId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
