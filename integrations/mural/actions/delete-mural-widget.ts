import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the widget. Example: "workspace1234.1606743986126"'),
        widgetId: z.string().describe('Unique identifier of the widget to delete. Example: "05e43d68-0a0a-47a8-a958-c08afd57d7bc"')
    })
    .describe('Identifies the widget to permanently delete from a mural.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the widget was deleted successfully.'),
        muralId: z.string().describe('Unique identifier of the mural the widget was deleted from.'),
        widgetId: z.string().describe('Unique identifier of the deleted widget.')
    })
    .describe('Confirmation that the widget was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a widget from a mural through the provider's delete endpoint, permanently removing the widget and its content.
 * @pitfalls: Deletion is permanent - Mural has no recycle bin or restore endpoint. Widget IDs are not unique across murals (a duplicated mural reuses the same widget IDs), so pass the mural that actually owns the widget.
 */
const action = createAction({
    description: 'Permanently delete a single widget from a mural, regardless of its type.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/deletewidgetbyid
        await nango.delete({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/${encodeURIComponent(input.widgetId)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- a retry after a lost success response would 404 on the already-deleted resource and report a completed delete as a failure.
            retries: 0
        });

        return {
            success: true,
            muralId: input.muralId,
            widgetId: input.widgetId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
