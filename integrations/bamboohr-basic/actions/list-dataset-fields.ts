import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    datasetName: z.string().optional().describe('Dataset name to list fields for. Example: "employee"')
});

const ProviderResponseSchema = z.object({
    name: z.string(),
    label: z.string().optional(),
    pagination: z
        .object({
            total_records: z.number(),
            total_pages: z.number()
        })
        .optional(),
    fields: z.array(
        z.object({
            name: z.string(),
            label: z.string(),
            parentType: z.string().optional(),
            parentName: z.string().optional(),
            entityName: z.string().optional()
        })
    )
});

const OutputSchema = z.object({
    fields: z.array(
        z.object({
            name: z.string(),
            label: z.string(),
            parentName: z.string().optional(),
            entityName: z.string().optional()
        })
    )
});

const action = createAction({
    description:
        'List available fields for a BambooHR v2 dataset (e.g. "employee"). Use this to discover valid field names before configuring the employees sync.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-dataset-fields',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const datasetName = input?.datasetName ?? 'employee';

        const connection = await nango.getConnection();
        const subdomain = connection.connection_config?.['subdomain'];
        if (typeof subdomain !== 'string' || subdomain.length === 0) {
            throw new nango.ActionError({
                type: 'missing_subdomain',
                message: 'BambooHR subdomain is missing from the connection config.'
            });
        }

        // https://documentation.bamboohr.com/reference/get-fields-from-dataset
        // Note: the path uses v1_2 (underscore), not v1.2 (period).
        const response = await nango.get({
            endpoint: `/v1_2/datasets/${datasetName}/fields`,
            baseUrlOverride: `https://${subdomain}.bamboohr.com/api`,
            headers: { Accept: 'application/json' },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            fields: parsed.fields.map((f) => ({
                name: f.name,
                label: f.label,
                ...(f.parentName != null && { parentName: f.parentName }),
                ...(f.entityName != null && { entityName: f.entityName })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
