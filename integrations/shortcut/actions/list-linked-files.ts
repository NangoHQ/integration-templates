import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LinkedFileSchema = z.object({
    id: z.number().describe('The unique identifier for the file. Example: 123'),
    name: z.string().describe('The name of the linked file.'),
    url: z.string().describe('The URL of the file.'),
    type: z.string().describe("The integration type (e.g. 'google', 'dropbox', 'box')."),
    content_type: z.string().nullable().optional().describe('The content type of the image (e.g. text/plain).'),
    created_at: z.string().describe('The time/date the LinkedFile was created.'),
    updated_at: z.string().describe('The time/date the LinkedFile was updated.'),
    description: z.string().nullable().optional().describe('The description of the file.'),
    entity_type: z.string().describe('A string description of this resource.'),
    group_mention_ids: z.array(z.string()).describe('The groups that are mentioned in the description of the file.'),
    member_mention_ids: z.array(z.string()).describe('The members that are mentioned in the description of the file.'),
    mention_ids: z.array(z.string()).describe('Deprecated: use member_mention_ids.'),
    size: z.number().nullable().optional().describe('The filesize, if the integration provided it.'),
    story_ids: z.array(z.number()).describe('The IDs of the stories this file is attached to.'),
    thumbnail_url: z.string().nullable().optional().describe('The URL of the file thumbnail, if the integration provided it.'),
    uploader_id: z.string().describe('The UUID of the member that uploaded the file.')
});

const OutputSchema = z.array(LinkedFileSchema);

const action = createAction({
    description: 'List linked (URL-based) files.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#List-Linked-Files
            endpoint: '/api/v3/linked-files',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of linked files from the Shortcut API.'
            });
        }

        const parsed = response.data.map((item: unknown) => {
            const result = LinkedFileSchema.safeParse(item);
            if (!result.success) {
                throw new nango.ActionError({
                    type: 'schema_validation_error',
                    message: 'Failed to parse a linked file from the Shortcut API response.',
                    details: result.error.issues
                });
            }
            return result.data;
        });

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
