import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        toolId: z.number().describe('The numeric ID of the dock tool to retrieve.')
    })
    .describe('Input for retrieving a single dock tool by its ID.');

const BucketSchema = z
    .object({
        id: z.number().describe('The project ID this tool belongs to.'),
        name: z.string().describe('The project name.')
    })
    .optional();

const CreatorSchema = z
    .object({
        id: z.number().describe('The person ID of the tool creator.'),
        name: z.string().describe('The full name of the tool creator.')
    })
    .optional();

const OutputSchema = z
    .object({
        id: z.number().describe('The unique numeric ID of the dock tool.'),
        status: z.string().describe('The current status of the tool, e.g. "active" or "inactive".'),
        title: z.string().describe('The display title of the tool.'),
        type: z.string().describe('The tool type, e.g. "todoset", "message_board", "vault", "chat", "kanban_board", "schedule", "questionnaire", "inbox".'),
        url: z.string().describe('The canonical API URL for this tool.'),
        app_url: z.string().describe('The Basecamp web application URL for this tool.'),
        bucket: BucketSchema.describe('The project (bucket) that contains this tool.'),
        creator: CreatorSchema.describe('The person who created this tool.'),
        position: z.number().optional().describe('The zero-based position of this tool in the project dock.')
    })
    .passthrough()
    .describe('A single dock tool object from the project dock.');

/**
 * @tags: [read]
 * @tagReason: Reads a single dock tool by its ID.
 * @pitfalls: Returns a valid 200 response for tools that are disabled in the project dock, not a 404 or error.
 */
const action = createAction({
    description: "Get a single dock tool (e.g. a project's Chat, Card Table, or Message Board tool object) by its ID.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/tools.md
            endpoint: `/dock/tools/${encodeURIComponent(input.toolId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Dock tool with ID ${input.toolId} was not found.`,
                toolId: input.toolId
            });
        }

        const tool = OutputSchema.parse(response.data);
        return tool;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
