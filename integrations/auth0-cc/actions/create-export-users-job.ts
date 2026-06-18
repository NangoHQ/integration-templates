import { z } from 'zod';
import { createAction } from 'nango';

const ExportFieldSchema = z.object({
    name: z.string(),
    export_as: z.string().optional()
});

const InputSchema = z.object({
    connection_id: z
        .string()
        .regex(/^con_[A-Za-z0-9]{16}$/)
        .optional()
        .describe('Connection ID from which users will be exported. Example: con_0000000000000001'),
    format: z.enum(['json', 'csv']).optional().describe('Format of the exported file. Must be json or csv.'),
    limit: z.number().int().min(1).optional().describe('Limit the number of records to export.'),
    fields: z.array(ExportFieldSchema).optional().describe('List of fields to include in the export.')
});

const ProviderJobSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        status: z.string(),
        connection: z.string().optional(),
        created_at: z.string().optional(),
        connection_id: z.string().optional(),
        format: z.enum(['json', 'csv']).optional(),
        limit: z.number().int().optional(),
        fields: z.array(ExportFieldSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    connection: z.string().optional(),
    created_at: z.string().optional(),
    connection_id: z.string().optional(),
    format: z.enum(['json', 'csv']).optional(),
    limit: z.number().int().optional(),
    fields: z.array(ExportFieldSchema).optional()
});

const action = createAction({
    description: 'Start a bulk user export job in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/jobs/post-users-exports
            endpoint: '/api/v2/jobs/users-exports',
            data: {
                ...(input.connection_id !== undefined && { connection_id: input.connection_id }),
                ...(input.format !== undefined && { format: input.format }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const providerJob = ProviderJobSchema.parse(response.data);

        return {
            id: providerJob.id,
            type: providerJob.type,
            status: providerJob.status,
            ...(providerJob.connection !== undefined && { connection: providerJob.connection }),
            ...(providerJob.created_at !== undefined && { created_at: providerJob.created_at }),
            ...(providerJob.connection_id !== undefined && { connection_id: providerJob.connection_id }),
            ...(providerJob.format !== undefined && { format: providerJob.format }),
            ...(providerJob.limit !== undefined && { limit: providerJob.limit }),
            ...(providerJob.fields !== undefined && { fields: providerJob.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
