import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    baseId: z.string().min(1).describe('The ID of the Airtable base'),
    tableIdOrName: z.string().min(1).describe('The ID or name of the table'),
    recordId: z.string().min(1).describe('The ID of the record'),
    rowCommentId: z.string().min(1).describe('The ID of the comment to delete')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the comment was successfully deleted'),
    rowCommentId: z.string().describe('The ID of the deleted comment')
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export default createAction({
    description: 'Delete a comment from an Airtable record',
    // https://airtable.com/developers/web/api/delete-comment
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango: NangoAction, input: Input): Promise<Output> => {
        const { baseId, tableIdOrName, recordId, rowCommentId } = input;

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/delete-comment
            endpoint: `/v0/${baseId}/${tableIdOrName}/${recordId}/comments/${rowCommentId}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true,
            rowCommentId: rowCommentId
        };
    }
});
