import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucket_id: z.string().describe('Storage bucket ID to delete. Example: "nango-del-bucket-1"')
});

const ListObjectSchema = z.object({
    name: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    bucket_id: z.string()
});

const ConnectionConfigSchema = z.object({
    projectUrl: z.string()
});

const action = createAction({
    description: 'Delete or archive a storage bucket in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-storage-bucket'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        const projectUrl = connectionConfig.success ? connectionConfig.data.projectUrl : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;

        const bucketId = input.bucket_id;

        // List and delete all objects in the bucket because the bucket must be empty before deletion.
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const listResponse = await nango.post({
                // https://supabase.com/docs/reference/api/storage-list-objects
                endpoint: `/storage/v1/object/list/${encodeURIComponent(bucketId)}`,
                data: {
                    limit,
                    offset,
                    prefix: ''
                },
                baseUrlOverride,
                retries: 3
            });

            const objects = z.array(ListObjectSchema).parse(listResponse.data || []);

            if (objects.length > 0) {
                const prefixes = objects.map((obj) => obj.name);

                await nango.delete({
                    // https://supabase.com/docs/reference/api/storage-delete-objects
                    endpoint: `/storage/v1/object/${encodeURIComponent(bucketId)}`,
                    data: {
                        prefixes
                    },
                    baseUrlOverride,
                    retries: 3
                });
            }

            hasMore = objects.length === limit;
            offset += limit;
        }

        await nango.delete({
            // https://supabase.com/docs/reference/api/storage-delete-bucket
            endpoint: `/storage/v1/bucket/${encodeURIComponent(bucketId)}`,
            baseUrlOverride,
            retries: 3
        });

        return {
            success: true,
            bucket_id: bucketId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
