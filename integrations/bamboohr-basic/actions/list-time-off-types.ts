import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderTimeOffTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    units: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    source: z.string().nullable().optional()
});

const TimeOffTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    units: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    source: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TimeOffTypeSchema)
});

const action = createAction({
    description: 'List time off types configured in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-time-off-types',
        group: 'Time Off'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-time-off-types
            endpoint: '/v1/meta/time_off/types',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const data = response.data;
        if (data === null || data === undefined || typeof data !== 'object') {
            return { items: [] };
        }

        const providerResponse = z
            .object({
                timeOffTypes: z.array(ProviderTimeOffTypeSchema).optional()
            })
            .safeParse(data);

        if (!providerResponse.success) {
            return { items: [] };
        }

        const items =
            providerResponse.data.timeOffTypes?.map((type) => ({
                id: type.id,
                name: type.name,
                ...(type.units !== null && type.units !== undefined && { units: type.units }),
                ...(type.color !== null && type.color !== undefined && { color: type.color }),
                ...(type.icon !== null && type.icon !== undefined && { icon: type.icon }),
                ...(type.source !== null && type.source !== undefined && { source: type.source })
            })) || [];

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
