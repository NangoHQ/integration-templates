import { createSync } from 'nango';
import { z } from 'zod';

const ExternalRequesterSchema = z
    .object({
        id: z.string().describe('Opaque Wrike ID of the external requester.'),
        email: z.string().describe('Email address of the external requester.'),
        firstName: z.string().describe('First name of the external requester.'),
        lastName: z.string().optional().describe('Last name of the external requester, when provided.')
    })
    .describe('Details about a commenter who is outside the account (an email comment author).');

const CommentSchema = z
    .object({
        id: z.string().describe('Stable unique identifier of the comment, an opaque Wrike ID (never a sequential number).'),
        authorId: z.string().describe('Opaque Wrike ID of the user or contact who authored the comment.'),
        text: z.string().describe('Comment body. Returned as HTML by default, since the sync does not request plain text.'),
        createdDate: z.string().describe('Timestamp when the comment was created, in ISO 8601 format (yyyy-MM-ddTHH:mm:ssZ).'),
        updatedDate: z
            .string()
            .optional()
            .describe('Comment timestamp field. Wrike currently returns the created date here even though it is named updatedDate; treat it as unreliable.'),
        taskId: z
            .string()
            .optional()
            .describe('Opaque Wrike ID of the task this comment belongs to. Present only for task comments (mutually exclusive with folderId).'),
        folderId: z
            .string()
            .optional()
            .describe(
                'Opaque Wrike ID of the folder or project this comment belongs to. Present only for folder/project comments (mutually exclusive with taskId).'
            ),
        attachmentIds: z.array(z.string()).optional().describe('Opaque Wrike IDs of attachments included in the comment, when any are present.'),
        type: z.string().optional().describe('Comment type: Regular or Email.'),
        emailSubject: z.string().optional().describe('Subject line of the source email. Present only for Email comments.'),
        direction: z.string().optional().describe('Direction of the source email (Outgoing or Incoming). Present only for Email comments.'),
        externalRequester: ExternalRequesterSchema.optional().describe(
            'External requester details. Present only when the comment came from outside the account.'
        )
    })
    .describe('A comment (Regular or Email) posted on a Wrike task, folder, or project.');

const CommentsResponseSchema = z.object({
    kind: z.literal('comments').describe('Envelope discriminator returned by the provider for comment listings.'),
    data: z.array(CommentSchema).describe('All comments in the account.')
});

const sync = createSync({
    description: 'Sync every comment across the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Comment: CommentSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /comments returns every account comment in a single response.
        // There is no cursor/page-token pagination (pageSize and nextPageToken are rejected),
        // and neither the updatedDate nor the createdDate filter tracks edited comments, so
        // deletions are surfaced with trackDeletesStart/trackDeletesEnd instead of checkpoints.
        await nango.trackDeletesStart('Comment');

        // https://developers.wrike.com/reference/getcommentsempty
        const response = await nango.get({
            endpoint: '/comments',
            params: {
                limit: 100000,
                // Wrike omits the comment type unless it is requested through fields.
                fields: JSON.stringify(['type'])
            },
            retries: 3
        });

        const parsed = CommentsResponseSchema.parse(response.data);

        const comments = parsed.data.map((comment) => ({
            id: comment.id,
            authorId: comment.authorId,
            text: comment.text,
            createdDate: comment.createdDate,
            ...(comment.updatedDate != null && { updatedDate: comment.updatedDate }),
            ...(comment.taskId != null && { taskId: comment.taskId }),
            ...(comment.folderId != null && { folderId: comment.folderId }),
            ...(comment.attachmentIds != null && { attachmentIds: comment.attachmentIds }),
            ...(comment.type != null && { type: comment.type }),
            ...(comment.emailSubject != null && { emailSubject: comment.emailSubject }),
            ...(comment.direction != null && { direction: comment.direction }),
            ...(comment.externalRequester != null && { externalRequester: comment.externalRequester })
        }));

        if (comments.length > 0) {
            await nango.batchSave(comments, 'Comment');
        }

        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
