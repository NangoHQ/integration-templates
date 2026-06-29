import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"'),
    name: z.string().describe('Name of the page.'),
    subtitle: z.string().optional().describe('Subtitle of the page.'),
    iconName: z.string().optional().describe('Name of the icon.'),
    imageUrl: z.string().optional().describe('URL of the cover image to use.'),
    parentPageId: z.string().optional().describe("The ID of this new page's parent, if creating a subpage.")
});

const CreatePageResponseSchema = z.object({
    id: z.string(),
    requestId: z.string()
});

const MutationStatusResponseSchema = z.object({
    completed: z.boolean(),
    warning: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    requestId: z.string(),
    completed: z.boolean()
});

const MAX_POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 2000;

function hasStatusCode(error: unknown, status: number): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if ('status' in error && error.status === status) {
        return true;
    }
    if ('statusCode' in error && error.statusCode === status) {
        return true;
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null) {
        if ('status' in error.response && error.response.status === status) {
            return true;
        }
    }
    return false;
}

const action = createAction({
    description: 'Create a new page in a doc.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-page' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1#tag/Pages/operation/createPage
        const createResponse = await nango.post({
            endpoint: `/docs/${encodeURIComponent(input.docId)}/pages`,
            data: {
                name: input.name,
                ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
                ...(input.iconName !== undefined && { iconName: input.iconName }),
                ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
                ...(input.parentPageId !== undefined && { parentPageId: input.parentPageId })
            },
            retries: 3
        });

        const createResult = CreatePageResponseSchema.parse(createResponse.data);
        const pageId = createResult.id;
        const requestId = createResult.requestId;

        let completed = false;
        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
            // https://coda.io/developers/apis/v1#tag/Miscellaneous/operation/getMutationStatus
            // @allowTryCatch Mutation status may return 404 if the request already completed or expired.
            try {
                const statusResponse = await nango.get({
                    endpoint: `/mutationStatus/${encodeURIComponent(requestId)}`,
                    retries: 3
                });

                if (statusResponse.status === 404) {
                    completed = true;
                    break;
                }

                const statusResult = MutationStatusResponseSchema.parse(statusResponse.data);
                if (statusResult.completed) {
                    completed = true;
                    break;
                }
            } catch (error) {
                if (hasStatusCode(error, 404)) {
                    completed = true;
                    break;
                }
                throw error;
            }

            await new Promise((resolve) => {
                setTimeout(resolve, POLL_DELAY_MS);
            });
        }

        if (!completed) {
            throw new nango.ActionError({
                type: 'timeout',
                message: `Page creation did not complete within ${MAX_POLL_ATTEMPTS * POLL_DELAY_MS}ms. requestId: ${requestId}`
            });
        }

        return {
            id: pageId,
            requestId: requestId,
            completed: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
