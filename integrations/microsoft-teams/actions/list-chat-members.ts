import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    chat_id: z.string().describe('The unique identifier of the chat. Example: "19:xxxxx@thread.v2"'),
    cursor: z.string().optional().describe('Full URL from @odata.nextLink for pagination. Omit for the first page.')
});

const ConversationMemberSchema = z.object({
    id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    displayName: z.string().optional().nullable(),
    visibleHistoryStartDateTime: z.string().optional().nullable(),
    userId: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    tenantId: z.string().optional().nullable()
});

const ListMembersResponseSchema = z.object({
    '@odata.nextLink': z.string().optional(),
    value: z.array(ConversationMemberSchema)
});

const MemberOutputSchema = z.object({
    id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    display_name: z.string().optional(),
    visible_history_start_date_time: z.string().optional(),
    user_id: z.string().optional(),
    email: z.string().optional(),
    tenant_id: z.string().optional()
});

const OutputSchema = z.object({
    members: z.array(MemberOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List members in a chat',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-chat-members',
        group: 'Chats'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/chat-list-members
        const response = await nango.get({
            endpoint: input.cursor || `/v1.0/chats/${input.chat_id}/members`,
            retries: 3
        });

        const validated = ListMembersResponseSchema.parse(response.data);

        const members = validated.value.map((member) => ({
            ...(member.id !== undefined && { id: member.id }),
            ...(member.roles !== undefined && { roles: member.roles }),
            ...(member.displayName != null && { display_name: member.displayName }),
            ...(member.visibleHistoryStartDateTime != null && { visible_history_start_date_time: member.visibleHistoryStartDateTime }),
            ...(member.userId != null && { user_id: member.userId }),
            ...(member.email != null && { email: member.email }),
            ...(member.tenantId != null && { tenant_id: member.tenantId })
        }));

        return {
            members,
            ...(validated['@odata.nextLink'] !== undefined && { next_cursor: validated['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
