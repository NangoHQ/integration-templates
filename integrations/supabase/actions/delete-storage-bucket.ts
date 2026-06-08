import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucket_id: z.string().describe('Storage bucket ID to delete. Example: "nango-del-bucket-1"')
});

const ListObjectSchema = z.object({
    name: z.string(),
    id: z.string().nullable().optional()
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
        const baseUrlOverride = typeof projectUrl === 'string' ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const bucketId = input.bucket_id;

        // List and delete all objects in the bucket (including nested folders) before deletion.
        // Supabase requires the bucket to be empty. We traverse the prefix tree and always
        // re-list from offset 0 after each delete batch since deleting shrinks the listing.
        const limit = 1000;
        const prefixQueue: string[] = [''];

        const queuedPrefixes = new Set<string>(['']);

        while (prefixQueue.length > 0) {
            const prefix = prefixQueue[0]!;

            // Keep listing from offset 0: after each delete the same prefix has fewer items.
            while (true) {
                const listResponse = await nango.post({
                    // https://supabase.com/docs/reference/api/storage-list-objects
                    endpoint: `/storage/v1/object/list/${encodeURIComponent(bucketId)}`,
                    data: {
                        limit,
                        offset: 0,
                        prefix
                    },
                    baseUrlOverride,
                    retries: 3
                });

                const objects = z.array(ListObjectSchema).parse(listResponse.data || []);
                if (objects.length === 0) {
                    break;
                }

                const files = objects.filter((obj) => obj.id != null);
                const folders = objects.filter((obj) => obj.id == null);

                for (const folder of folders) {
                    const folderName = folder.name.endsWith('/') ? folder.name.slice(0, -1) : folder.name;
                    const subPrefix = prefix ? `${prefix}${folderName}/` : `${folderName}/`;
                    if (!queuedPrefixes.has(subPrefix)) {
                        queuedPrefixes.add(subPrefix);
                        prefixQueue.push(subPrefix);
                    }
                }

                if (files.length > 0) {
                    const prefixes = files.map((obj) => (prefix ? `${prefix}${obj.name}` : obj.name));

                    await nango.delete({
                        // https://supabase.com/docs/reference/api/storage-delete-objects
                        endpoint: `/storage/v1/object/${encodeURIComponent(bucketId)}`,
                        data: { prefixes },
                        baseUrlOverride,
                        retries: 3
                    });
                }

                if (objects.length < limit) {
                    break;
                }
            }

            prefixQueue.shift();
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
