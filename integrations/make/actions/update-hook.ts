import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('The ID of the hook to rename. Example: 3329422'),
    name: z.string().describe('The new name for the hook.')
});

const HookSchema = z.object({
    id: z.number(),
    name: z.string(),
    typeName: z.string().optional(),
    teamId: z.number().optional(),
    scenarioId: z.number().nullable().optional(),
    url: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    dataStructure: z.unknown().optional(),
    incomings: z.unknown().optional()
});

const OutputSchema = z.object({
    hook: HookSchema
});

const action = createAction({
    description: 'Rename a hook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation
        const response = await nango.patch({
            endpoint: `/hooks/${encodeURIComponent(input.hookId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Hook not found or update failed.',
                hookId: input.hookId
            });
        }

        const parsed = z.object({ hook: HookSchema }).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Make API returned an unexpected response shape when updating the hook.',
                details: parsed.error.issues
            });
        }

        return {
            hook: parsed.data.hook
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
