import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021')
});

const UserSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional()
});

const SchedulingSchema = z.object({
    type: z.string().optional(),
    interval: z.number().optional()
});

const DeviceSchema = z.object({
    id: z.number(),
    scope: z.string()
});

const ProviderScenarioSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number(),
    hookId: z.number().optional().nullable(),
    devices: z.array(DeviceSchema).optional().nullable(),
    deviceId: z.number().optional().nullable(),
    deviceScope: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    folderId: z.number().optional().nullable(),
    isinvalid: z.boolean().optional().nullable(),
    islinked: z.boolean().optional().nullable(),
    isActive: z.boolean().optional().nullable(),
    islocked: z.boolean().optional().nullable(),
    isPaused: z.boolean().optional().nullable(),
    usedPackages: z.array(z.string()).optional().nullable(),
    lastEdit: z.string().optional().nullable(),
    scheduling: SchedulingSchema.optional().nullable(),
    iswaiting: z.boolean().optional().nullable(),
    dlqCount: z.number().optional().nullable(),
    createdByUser: UserSchema.optional().nullable(),
    updatedByUser: UserSchema.optional().nullable(),
    nextExec: z.string().optional().nullable(),
    created: z.string().optional().nullable(),
    scenarioVersion: z.number().optional().nullable(),
    moduleSequenceId: z.number().optional().nullable(),
    type: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    scenario: ProviderScenarioSchema
});

const OutputScenarioSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number(),
    hookId: z.number().optional(),
    devices: z.array(DeviceSchema).optional(),
    deviceId: z.number().optional(),
    deviceScope: z.string().optional(),
    description: z.string().optional(),
    folderId: z.number().optional(),
    isinvalid: z.boolean().optional(),
    islinked: z.boolean().optional(),
    isActive: z.boolean().optional(),
    islocked: z.boolean().optional(),
    isPaused: z.boolean().optional(),
    usedPackages: z.array(z.string()).optional(),
    lastEdit: z.string().optional(),
    scheduling: SchedulingSchema.optional(),
    iswaiting: z.boolean().optional(),
    dlqCount: z.number().optional(),
    createdByUser: UserSchema.optional(),
    updatedByUser: UserSchema.optional(),
    nextExec: z.string().optional(),
    created: z.string().optional(),
    scenarioVersion: z.number().optional(),
    moduleSequenceId: z.number().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    scenario: OutputScenarioSchema
});

function normalizeScenario(providerScenario: z.infer<typeof ProviderScenarioSchema>): z.infer<typeof OutputScenarioSchema> {
    return {
        id: providerScenario.id,
        name: providerScenario.name,
        teamId: providerScenario.teamId,
        ...(providerScenario.hookId != null && { hookId: providerScenario.hookId }),
        ...(providerScenario.devices != null && { devices: providerScenario.devices }),
        ...(providerScenario.deviceId != null && { deviceId: providerScenario.deviceId }),
        ...(providerScenario.deviceScope != null && { deviceScope: providerScenario.deviceScope }),
        ...(providerScenario.description != null && { description: providerScenario.description }),
        ...(providerScenario.folderId != null && { folderId: providerScenario.folderId }),
        ...(providerScenario.isinvalid != null && { isinvalid: providerScenario.isinvalid }),
        ...(providerScenario.islinked != null && { islinked: providerScenario.islinked }),
        ...(providerScenario.isActive != null && { isActive: providerScenario.isActive }),
        ...(providerScenario.islocked != null && { islocked: providerScenario.islocked }),
        ...(providerScenario.isPaused != null && { isPaused: providerScenario.isPaused }),
        ...(providerScenario.usedPackages != null && { usedPackages: providerScenario.usedPackages }),
        ...(providerScenario.lastEdit != null && { lastEdit: providerScenario.lastEdit }),
        ...(providerScenario.scheduling != null && { scheduling: providerScenario.scheduling }),
        ...(providerScenario.iswaiting != null && { iswaiting: providerScenario.iswaiting }),
        ...(providerScenario.dlqCount != null && { dlqCount: providerScenario.dlqCount }),
        ...(providerScenario.createdByUser != null && { createdByUser: providerScenario.createdByUser }),
        ...(providerScenario.updatedByUser != null && { updatedByUser: providerScenario.updatedByUser }),
        ...(providerScenario.nextExec != null && { nextExec: providerScenario.nextExec }),
        ...(providerScenario.created != null && { created: providerScenario.created }),
        ...(providerScenario.scenarioVersion != null && { scenarioVersion: providerScenario.scenarioVersion }),
        ...(providerScenario.moduleSequenceId != null && { moduleSequenceId: providerScenario.moduleSequenceId }),
        ...(providerScenario.type != null && { type: providerScenario.type })
    };
}

const action = createAction({
    description: 'Retrieve all properties of a single scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/scenarios
        const response = await nango.get({
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Scenario not found or no data returned.',
                scenarioId: input.scenarioId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            scenario: normalizeScenario(providerResponse.scenario)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
