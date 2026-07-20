import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Group sys_id. Example: "284687b9c3ca0310c5a8fc0d05013151"'),
    name: z.string().optional().describe('Group name.'),
    description: z.string().optional().describe('Group description.'),
    active: z.boolean().optional().describe('Whether the group is active.'),
    manager: z.string().optional().describe('Sys ID of the manager user.'),
    parent: z.string().optional().describe('Sys ID of the parent group.'),
    cost_center: z.string().optional().describe('Sys ID of the cost center.'),
    email: z.string().optional().describe('Group email address.')
});

const ProviderGroupSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.union([z.string(), z.boolean()]).optional(),
        manager: z.union([z.string(), z.object({}).passthrough()]).optional(),
        parent: z.union([z.string(), z.object({}).passthrough()]).optional(),
        cost_center: z.union([z.string(), z.object({}).passthrough()]).optional(),
        email: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        sys_created_by: z.string().optional(),
        sys_updated_by: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.union([z.string(), z.boolean()]).optional(),
        manager: z.union([z.string(), z.object({}).passthrough()]).optional(),
        parent: z.union([z.string(), z.object({}).passthrough()]).optional(),
        cost_center: z.union([z.string(), z.object({}).passthrough()]).optional(),
        email: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        sys_created_by: z.string().optional(),
        sys_updated_by: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update group fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['itil', 'admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.active !== undefined) {
            body['active'] = input.active;
        }
        if (input.manager !== undefined) {
            body['manager'] = input.manager;
        }
        if (input.parent !== undefined) {
            body['parent'] = input.parent;
        }
        if (input.cost_center !== undefined) {
            body['cost_center'] = input.cost_center;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }

        const response = await nango.patch({
            // https://developer.servicenow.com/dev.do#!/reference/api/now-rest-api/table-api
            // Group name/description/active/manager/etc. are plain overwrite fields (not
            // journal-append), so retrying a transient failure is safe.
            endpoint: `/api/now/table/sys_user_group/${encodeURIComponent(input.sys_id)}`,
            data: body,
            retries: 1
        });

        const TableApiResponseSchema = z.object({
            result: z.unknown()
        });

        const parsedResponse = TableApiResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from ServiceNow Table API.'
            });
        }

        const rawResult = parsedResponse.data.result;
        if (rawResult === null || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'ServiceNow Table API response missing result field.'
            });
        }

        const providerGroup = ProviderGroupSchema.parse(rawResult);

        return {
            sys_id: providerGroup.sys_id,
            ...(providerGroup.name !== undefined && { name: providerGroup.name }),
            ...(providerGroup.description !== undefined && { description: providerGroup.description }),
            ...(providerGroup.active !== undefined && { active: providerGroup.active }),
            ...(providerGroup.manager !== undefined && { manager: providerGroup.manager }),
            ...(providerGroup.parent !== undefined && { parent: providerGroup.parent }),
            ...(providerGroup.cost_center !== undefined && { cost_center: providerGroup.cost_center }),
            ...(providerGroup.email !== undefined && { email: providerGroup.email }),
            ...(providerGroup.sys_created_on !== undefined && { sys_created_on: providerGroup.sys_created_on }),
            ...(providerGroup.sys_updated_on !== undefined && { sys_updated_on: providerGroup.sys_updated_on }),
            ...(providerGroup.sys_created_by !== undefined && { sys_created_by: providerGroup.sys_created_by }),
            ...(providerGroup.sys_updated_by !== undefined && { sys_updated_by: providerGroup.sys_updated_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
