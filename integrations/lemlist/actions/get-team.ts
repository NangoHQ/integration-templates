import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({}).describe('No input required. The team is resolved from the API key of the connection.');

const OutputSchema = z
    .object({
        _id: z.string().optional().describe('Unique identifier of the team. Example: "tea_b4rMsi2trBhahaha"'),
        name: z.string().optional().describe('Name of the team. Example: "lemlist"'),
        userIds: z.array(z.string()).optional().describe('IDs of the users who are members of the team. Example: ["usr_4YGm9ez7gMdyhahaha"]'),
        createdBy: z.string().optional().describe('ID of the user who created the team. Example: "usr_4YGm9ez7gMdyhahaha"'),
        createdAt: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Example: "2018-02-22T08:52:30.926Z"'),
        beta: z.array(z.string()).optional().describe('Beta feature flags enabled for the team. Example: ["outreachQueue"]'),
        creatorDomain: z.string().optional().describe('Email domain of the user who created the team. Example: "lemlist.com"')
    })
    .describe('Information about the lemlist team associated with the connection.');

/**
 * @tags: [read]
 * @tagReason: Performs a single idempotent GET request to fetch team information without modifying any provider state.
 */
const action = createAction({
    description: "Get the current team's info (name, member user IDs, beta flags, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/team/get-team
            endpoint: '/api/team',
            retries: 3
        };
        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
