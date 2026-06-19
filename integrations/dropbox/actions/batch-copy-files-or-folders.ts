import { z } from 'zod';
import { createAction } from 'nango';

const RelocationPathSchema = z.object({
    from_path: z.string().describe('Source path in Dropbox. Example: "/folder/file.txt"'),
    to_path: z.string().describe('Destination path in Dropbox. Example: "/folder/destination.txt"')
});

const InputSchema = z.object({
    entries: z.array(RelocationPathSchema).min(1).describe('List of source and destination path pairs to copy'),
    autorename: z.boolean().optional().describe('If true, auto-rename conflicting files')
});

const CopyBatchEntryResultSchema = z.object({
    success: z
        .object({
            metadata: z.object({
                name: z.string(),
                path_lower: z.string(),
                id: z.string(),
                content_hash: z.string().optional(),
                server_modified: z.string().optional()
            })
        })
        .optional(),
    failure: z
        .object({
            failure_reason: z
                .object({
                    '.tag': z.string(),
                    description: z.string().optional()
                })
                .optional(),
            '.tag': z.string().optional()
        })
        .optional(),
    '.tag': z.string().optional()
});

const OutputSchema = z.object({
    async_job_id: z.string().optional(),
    entries: z.array(CopyBatchEntryResultSchema).optional(),
    is_complete: z.boolean().optional(),
    '.tag': z.string().optional()
});

const action = createAction({
    description: 'Copy multiple files or folders to new Dropbox paths in one batch job',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-copy_batch_v2
        const response = await nango.post({
            endpoint: '/2/files/copy_batch_v2',
            data: {
                entries: input.entries,
                autorename: input.autorename ?? false
            },
            retries: 3
        });

        const launchResult = z
            .object({
                '.tag': z.string(),
                async_job_id: z.string().optional(),
                entries: z.array(CopyBatchEntryResultSchema).optional()
            })
            .parse(response.data);

        // If the job is complete immediately, return the results
        if (launchResult['.tag'] === 'complete' && launchResult.entries) {
            return {
                '.tag': 'complete',
                is_complete: true,
                entries: launchResult.entries
            };
        }

        // If async job started, return the job ID for polling
        if (launchResult['.tag'] === 'async_job_id' && launchResult.async_job_id) {
            return {
                '.tag': 'async_job_id',
                async_job_id: launchResult.async_job_id,
                is_complete: false
            };
        }

        // If somehow incomplete tag, return as is
        return {
            '.tag': launchResult['.tag'],
            is_complete: false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
