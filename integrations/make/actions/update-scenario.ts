import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario to update. Example: 6413021'),
    name: z.string().optional().describe('A new name for the scenario.'),
    blueprint: z.string().optional().describe('The scenario blueprint as a stringified JSON object.'),
    scheduling: z.string().optional().describe('The scenario scheduling details as a stringified JSON object.')
});

const UserSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional()
});

const DeviceSchema = z.object({
    id: z.number(),
    scope: z.string().optional()
});

const SchedulingSchema = z.object({
    type: z.string().optional(),
    interval: z.number().optional()
});

const ScenarioSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    teamId: z.number().nullable().optional(),
    hookId: z.number().nullable().optional(),
    devices: z.array(DeviceSchema).nullable().optional(),
    deviceId: z.number().nullable().optional(),
    deviceScope: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    folderId: z.number().nullable().optional(),
    isinvalid: z.boolean().nullable().optional(),
    islinked: z.boolean().nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    islocked: z.boolean().nullable().optional(),
    isPaused: z.boolean().nullable().optional(),
    usedPackages: z.array(z.string()).nullable().optional(),
    lastEdit: z.string().nullable().optional(),
    scheduling: SchedulingSchema.nullable().optional(),
    iswaiting: z.boolean().nullable().optional(),
    dlqCount: z.number().nullable().optional(),
    createdByUser: UserSchema.nullable().optional(),
    updatedByUser: UserSchema.nullable().optional(),
    nextExec: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    scenarioVersion: z.number().nullable().optional(),
    moduleSequenceId: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    deletedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    scenario: ScenarioSchema
});

const action = createAction({
    description: "Update a scenario's name, blueprint, or scheduling.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.name !== undefined) {
            requestBody['name'] = input.name;
        }

        if (input.blueprint !== undefined) {
            requestBody['blueprint'] = input.blueprint;
        }

        if (input.scheduling !== undefined) {
            requestBody['scheduling'] = input.scheduling;
        }

        const response = await nango.patch({
            // https://developers.make.com/api-documentation/
            endpoint: `/scenarios/${encodeURIComponent(input.scenarioId)}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Scenario not found or update failed.',
                scenarioId: input.scenarioId
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
