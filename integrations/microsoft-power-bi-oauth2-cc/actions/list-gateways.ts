import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const GatewayPublicKeySchema = z.object({
    exponent: z.string().optional(),
    modulus: z.string().optional()
});

const GatewaySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    gatewayAnnotation: z.string().optional(),
    gatewayStatus: z.string().optional(),
    publicKey: GatewayPublicKeySchema.optional()
});

const OutputSchema = z.object({
    gateways: z.array(GatewaySchema)
});

const action = createAction({
    description: 'List on-premises data gateways visible to this service principal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/gateways/get-gateways
            endpoint: '/v1.0/myorg/gateways',
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const gateways = providerResponse.value.map((item) => {
            const gateway = GatewaySchema.parse(item);
            return {
                id: gateway.id,
                ...(gateway.name !== undefined && { name: gateway.name }),
                ...(gateway.type !== undefined && { type: gateway.type }),
                ...(gateway.gatewayAnnotation !== undefined && { gatewayAnnotation: gateway.gatewayAnnotation }),
                ...(gateway.gatewayStatus !== undefined && { gatewayStatus: gateway.gatewayStatus }),
                ...(gateway.publicKey !== undefined && { publicKey: gateway.publicKey })
            };
        });

        return {
            gateways
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
