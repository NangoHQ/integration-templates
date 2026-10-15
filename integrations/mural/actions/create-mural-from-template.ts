import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        templateId: z.string().describe('ID of the template to base the new mural on. Example: "033a3ea3-739f-457e-b957-40f259d4c196".'),
        title: z.string().describe('Title of the new mural.'),
        roomId: z.number().int().positive().describe('ID of the room that will contain the new mural. Example: 1791984264781658.'),
        folderId: z.string().optional().describe('ID of the folder within the room to place the new mural in. Omit to place it at the room root.')
    })
    .describe('Input for creating a new mural from an existing template.');

const UserInfoSchema = z.object({
    id: z.string().optional().describe('ID of the user.'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created mural. Example: "nangodev4776.1791996064416".'),
        title: z.string().describe('Title of the created mural.'),
        workspaceId: z.string().describe('ID of the workspace containing the mural.'),
        roomId: z.number().describe('ID of the room containing the mural.'),
        folderId: z.string().optional().describe('ID of the folder containing the mural, when it is nested in one.'),
        backgroundColor: z.string().optional().describe('Background color of the mural as an 8-digit hex string. Example: "#FAFAFAFF".'),
        width: z.number().optional().describe('Width of the mural canvas in pixels, derived from the template.'),
        height: z.number().optional().describe('Height of the mural canvas in pixels, derived from the template.'),
        status: z.string().describe('Whether the mural is "active" or "archived".'),
        createdOn: z.number().describe('Unix timestamp in milliseconds when the mural was created.'),
        updatedOn: z.number().describe('Unix timestamp in milliseconds when the mural was last updated.'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be used to embed the mural in a web page.'),
        createdBy: UserInfoSchema.optional().describe('User who created the mural.'),
        updatedBy: UserInfoSchema.optional().describe('User who last updated the mural.')
    })
    .describe('The newly created mural.');

const ResponseSchema = z.object({
    value: OutputSchema
});

/**
 * @tags: [write]
 * @tagReason: Creates a new mural in the target room through the provider API.
 * @pitfalls: Each call creates a new mural with no upsert or dry-run, so repeated invocations produce duplicate murals; the room and template must both be accessible to the connected workspace, otherwise the call fails with a not-found error.
 */
const action = createAction({
    description: 'Create a new mural pre-populated with a template layout/content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/createmuralfromtemplate
            endpoint: `/api/public/v1/templates/${encodeURIComponent(input.templateId)}/murals`,
            data: {
                title: input.title,
                roomId: input.roomId,
                ...(input.folderId !== undefined && { folderId: input.folderId })
            },
            // Non-idempotent create: a retry after a lost response would create a duplicate mural.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ResponseSchema.parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
