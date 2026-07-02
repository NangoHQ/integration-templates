import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021'),
    ids: z.array(z.string()).optional().describe('Specific incomplete execution IDs to delete.'),
    all: z.boolean().optional().describe('Set to true to delete all incomplete executions for the scenario.'),
    confirmed: z.boolean().optional().describe('Required when all is true. Set to true to confirm deletion of all incomplete executions.')
});

const DeleteResponseSchema = z.object({
    dlqs: z.array(z.string())
});

const OutputSchema = z.object({
    dlqs: z.array(z.string()).describe('IDs of the deleted incomplete executions.')
});

const action = createAction({
    description: 'Delete one or more incomplete executions for a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dlqs:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const ids = input.ids;
        const hasIds = ids !== undefined && ids.length > 0;

        if (input.all === true && hasIds) {
            throw new nango.ActionError({
                type: 'invalid_params',
                message: 'ids and all cannot be used together.'
            });
        }

        if (input.all === true) {
            if (input.confirmed !== true) {
                throw new nango.ActionError({
                    type: 'missing_confirmation',
                    message: 'confirmed must be true when all is true.'
                });
            }
        }

        if (input.all !== true && !hasIds) {
            throw new nango.ActionError({
                type: 'missing_target',
                message: 'Provide either ids or all=true.'
            });
        }

        const params: { scenarioId: number; confirmed?: string } = {
            scenarioId: input.scenarioId
        };

        if (input.all === true && input.confirmed === true) {
            params.confirmed = 'true';
        }

        const data = input.all === true ? { all: true } : { ids: ids };

        const response = await nango.delete({
            // https://developers.make.com/api-documentation/api-reference/incomplete-executions.md
            endpoint: '/dlqs',
            params,
            data,
            retries: 10
        });

        const parsed = DeleteResponseSchema.parse(response.data);

        return {
            dlqs: parsed.dlqs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
