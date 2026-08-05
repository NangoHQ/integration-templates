import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderNetworkZoneSchema = z.object({
    alternativeZones: z.array(z.string()).nullable().optional(),
    description: z.string().nullable().optional(),
    fallbackMode: z.string().nullable().optional(),
    id: z.string(),
    numOfConfiguredActiveGates: z.number().nullable().optional(),
    numOfConfiguredOneAgents: z.number().nullable().optional(),
    numOfOneAgentsFromOtherZones: z.number().nullable().optional(),
    numOfOneAgentsUsing: z.number().nullable().optional(),
    overridesGlobal: z.boolean().nullable().optional(),
    scope: z.string().nullable().optional()
});

const OutputNetworkZoneSchema = z.object({
    alternativeZones: z.array(z.string()).optional(),
    description: z.string().optional(),
    fallbackMode: z.string().optional(),
    id: z.string(),
    numOfConfiguredActiveGates: z.number().optional(),
    numOfConfiguredOneAgents: z.number().optional(),
    numOfOneAgentsFromOtherZones: z.number().optional(),
    numOfOneAgentsUsing: z.number().optional(),
    overridesGlobal: z.boolean().optional(),
    scope: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputNetworkZoneSchema)
});

const action = createAction({
    description: 'List configured network zones.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['networkZones.read'],

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/network-zones/get-all
            endpoint: '/api/v2/networkZones',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty response from Dynatrace API'
            });
        }

        const providerData = z
            .object({
                networkZones: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerData.networkZones.map((zone) => {
            const parsed = ProviderNetworkZoneSchema.parse(zone);
            return {
                id: parsed.id,
                ...(parsed.alternativeZones != null && { alternativeZones: parsed.alternativeZones }),
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.fallbackMode != null && { fallbackMode: parsed.fallbackMode }),
                ...(parsed.numOfConfiguredActiveGates != null && { numOfConfiguredActiveGates: parsed.numOfConfiguredActiveGates }),
                ...(parsed.numOfConfiguredOneAgents != null && { numOfConfiguredOneAgents: parsed.numOfConfiguredOneAgents }),
                ...(parsed.numOfOneAgentsFromOtherZones != null && { numOfOneAgentsFromOtherZones: parsed.numOfOneAgentsFromOtherZones }),
                ...(parsed.numOfOneAgentsUsing != null && { numOfOneAgentsUsing: parsed.numOfOneAgentsUsing }),
                ...(parsed.overridesGlobal != null && { overridesGlobal: parsed.overridesGlobal }),
                ...(parsed.scope != null && { scope: parsed.scope })
            };
        });

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
