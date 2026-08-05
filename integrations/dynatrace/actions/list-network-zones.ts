import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const NetworkZoneSchema = z.object({
    id: z.string(),
    description: z.string().nullable().optional(),
    fallbackMode: z.string().nullable().optional(),
    alternativeZones: z.array(z.string()).nullable().optional(),
    numOfConfiguredActiveGates: z.number().nullable().optional(),
    numOfConfiguredOneAgents: z.number().nullable().optional(),
    numOfOneAgentsFromOtherZones: z.number().nullable().optional(),
    numOfOneAgentsUsing: z.number().nullable().optional(),
    overridesGlobal: z.boolean().nullable().optional(),
    scope: z.string().nullable().optional()
});

const OutputSchema = z.object({
    networkZones: z.array(NetworkZoneSchema)
});

const action = createAction({
    description: 'List configured network zones.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['networkZones.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/network-zones/get-all
            endpoint: '/api/v2/networkZones',
            retries: 3
        });

        const providerList = z
            .object({
                networkZones: z.array(z.unknown())
            })
            .parse(response.data);

        const networkZones = providerList.networkZones.map((zone: unknown) => {
            const parsed = NetworkZoneSchema.parse(zone);
            return {
                id: parsed.id,
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.fallbackMode != null && { fallbackMode: parsed.fallbackMode }),
                ...(parsed.alternativeZones != null && { alternativeZones: parsed.alternativeZones }),
                ...(parsed.numOfConfiguredActiveGates != null && { numOfConfiguredActiveGates: parsed.numOfConfiguredActiveGates }),
                ...(parsed.numOfConfiguredOneAgents != null && { numOfConfiguredOneAgents: parsed.numOfConfiguredOneAgents }),
                ...(parsed.numOfOneAgentsFromOtherZones != null && { numOfOneAgentsFromOtherZones: parsed.numOfOneAgentsFromOtherZones }),
                ...(parsed.numOfOneAgentsUsing != null && { numOfOneAgentsUsing: parsed.numOfOneAgentsUsing }),
                ...(parsed.overridesGlobal != null && { overridesGlobal: parsed.overridesGlobal }),
                ...(parsed.scope != null && { scope: parsed.scope })
            };
        });

        return { networkZones };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
