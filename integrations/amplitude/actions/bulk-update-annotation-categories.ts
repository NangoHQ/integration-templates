import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the category to assign. Example: 12345'),
    annotation_ids: z.array(z.number()).describe('A list of annotation IDs to update. Example: [12345, 67890]')
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string().optional(),
    label: z.string().optional(),
    details: z.string().nullable().optional(),
    category: z
        .object({
            id: z.number(),
            category: z.string()
        })
        .optional(),
    end: z.string().nullable().optional(),
    chart_id: z.string().nullable().optional()
});

const OutputSchema = z.array(ProviderAnnotationSchema);

const ConnectionSchema = z.object({
    credentials: z
        .object({
            username: z.string(),
            password: z.string()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown())
});

const action = createAction({
    description: 'Assign an annotation category to multiple annotations.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/bulk-update-annotation-categories',
        group: 'Chart Annotations'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.parse(connection);
        const credentials = parsedConnection.credentials;

        const headers: Record<string, string> = {};
        if (credentials) {
            headers['Authorization'] = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
        }

        // https://amplitude.com/docs/apis/analytics/chart-annotations
        const response = await nango.put({
            endpoint: `/api/3/annotation-categories/bulk/${encodeURIComponent(String(input.category_id))}`,
            data: {
                annotation_ids: input.annotation_ids
            },
            headers,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned empty response data.'
            });
        }

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const annotations = parsedResponse.data.map((item) => ProviderAnnotationSchema.parse(item));

        return annotations;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
