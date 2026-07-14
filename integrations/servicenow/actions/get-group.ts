import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Group sys_id. Example: "284687b9c3ca0310c5a8fc0d05013151"')
});

const ReferenceFieldSchema = z.union([
    z.string(),
    z
        .object({
            link: z.string().optional(),
            value: z.string().optional()
        })
        .passthrough()
]);

const ProviderGroupSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        active: z.string().optional().nullable(),
        manager: ReferenceFieldSchema.optional().nullable(),
        parent: ReferenceFieldSchema.optional().nullable(),
        sys_created_on: z.string().optional().nullable(),
        sys_updated_on: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.string().optional(),
        manager: z.string().optional(),
        parent: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api/now/rest/table-api#get-table-by-id
        const response = await nango.get({
            endpoint: `/api/now/table/sys_user_group/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('result' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found or unexpected response format'
            });
        }

        const providerResult = ProviderGroupSchema.parse(response.data.result);

        const extractReferenceValue = (field: z.infer<typeof ReferenceFieldSchema> | null | undefined): string | undefined => {
            if (field == null) {
                return undefined;
            }
            if (typeof field === 'string') {
                return field;
            }
            return field.value;
        };

        const { sys_id, name, description, active, manager: rawManager, parent: rawParent, sys_created_on, sys_updated_on, ...rest } = providerResult;

        const manager = extractReferenceValue(rawManager);
        const parent = extractReferenceValue(rawParent);

        return {
            ...rest,
            sys_id,
            ...(name != null && { name }),
            ...(description != null && { description }),
            ...(active != null && { active }),
            ...(manager !== undefined && { manager }),
            ...(parent !== undefined && { parent }),
            ...(sys_created_on != null && { sys_created_on }),
            ...(sys_updated_on != null && { sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
