import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project whose dock contains the tool.'),
        toolId: z.number().describe('The recording ID of the tool to enable.')
    })
    .describe('Input to enable a dock tool on a Basecamp project.');

const ProviderToolSchema = z
    .object({
        id: z.number(),
        title: z.string().optional(),
        type: z.string().optional(),
        position: z.number().optional(),
        url: z.string().optional(),
        app_url: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the enabled tool.'),
        title: z.string().optional().describe('The display title of the tool.'),
        type: z.string().optional().describe('The Basecamp type of the tool (e.g. "Chat::Transcript").'),
        position: z.number().optional().describe('The position of the tool in the project dock.'),
        url: z.string().optional().describe('The API URL for the tool.'),
        app_url: z.string().optional().describe('The app URL for the tool.')
    })
    .describe('Output confirming the enabled dock tool.');

/**
 * @tags: [write]
 * @tagReason: Sends a POST request to re-enable an existing tool on a project's dock.
 * @pitfalls: Re-enables an existing dock tool and appends it to the end of the dock; it cannot add a tool type that is not already present on the project.
 */
const action = createAction({
    description: "Enable a project's dock tool (e.g. Message Board, Docs & Files, Chat, Card Table, Calendar), adding it back to the dock.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/tools.md#enable-a-tool
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.toolId)}/position.json`,
            retries: 3
        });

        let providerTool: z.infer<typeof ProviderToolSchema> | undefined;
        if (typeof response.data === 'object' && response.data !== null) {
            providerTool = ProviderToolSchema.parse(response.data);
        } else if (typeof response.data === 'string' && response.data.trim() === '') {
            providerTool = undefined;
        } else {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from provider.',
                data: response.data
            });
        }

        return {
            id: providerTool?.id ?? input.toolId,
            ...(providerTool?.title !== undefined && { title: providerTool.title }),
            ...(providerTool?.type !== undefined && { type: providerTool.type }),
            ...(providerTool?.position !== undefined && { position: providerTool.position }),
            ...(providerTool?.url !== undefined && { url: providerTool.url }),
            ...(providerTool?.app_url !== undefined && { app_url: providerTool.app_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
