import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('ID of the project whose members should be listed. Example: "6ac5b589bed7f77658a9a803"')
    })
    .describe('Input for listing the members of a TickTick project.');

const MemberSchema = z.object({
    username: z.string().describe('Username of the project member, typically the member email address.'),
    displayName: z.string().describe('Human-readable display name of the project member.'),
    self: z.boolean().describe('Whether this member is the connected TickTick user.')
});

const OutputSchema = z
    .object({
        members: z.array(MemberSchema).describe('Members of the project, as returned by the provider.')
    })
    .describe('Members of the requested TickTick project.');

/**
 * @tags: [read]
 * @tagReason: Reads the project member list from the provider without modifying any data.
 */
const action = createAction({
    description: 'List the members of a TickTick project, for use with assign-task.',
    version: '1.0.0',
    scopes: ['tasks:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Get Project Members)
        const response = await nango.get({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/members`,
            retries: 3
        });

        const members = z.array(MemberSchema).parse(response.data);

        return { members };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
