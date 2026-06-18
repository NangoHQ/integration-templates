import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LocationOptionSchema = z.object({
    id: z.number(),
    name: z.string(),
    archived: z.string().optional(),
    createdDate: z.string().nullable().optional(),
    archivedDate: z.string().nullable().optional(),
    manageable: z.string().optional(),
    frequency: z.string().nullable().optional()
});

const OutputSchema = z.object({
    locations: z.array(LocationOptionSchema)
});

const action = createAction({
    description: 'List office locations configured in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['field'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-list-fields
            endpoint: '/v1/meta/lists',
            headers: {
                Accept: 'application/json'
            },
            params: {
                format: 'json'
            },
            retries: 3
        });

        const providerLists = z.array(z.unknown()).parse(response.data);

        const locationList = providerLists.find((list: unknown) => {
            const parsed = z
                .object({
                    alias: z.string().nullable().optional()
                })
                .safeParse(list);
            return parsed.success && parsed.data.alias === 'location';
        });

        if (!locationList) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Location list not found in BambooHR account.'
            });
        }

        const parsedList = z
            .object({
                id: z.number().optional(),
                fieldId: z.number().optional(),
                name: z.string().optional(),
                alias: z.string().nullable().optional(),
                manageable: z.string().optional(),
                multiple: z.string().optional(),
                options: z.array(z.unknown()).optional()
            })
            .parse(locationList);

        const options = parsedList.options ?? [];
        const locations: z.infer<typeof LocationOptionSchema>[] = [];

        for (const option of options) {
            const parsed = LocationOptionSchema.safeParse(option);
            if (parsed.success) {
                locations.push(parsed.data);
            }
        }

        return {
            locations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
