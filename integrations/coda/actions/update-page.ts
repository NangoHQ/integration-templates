import { z } from 'zod';
import { createAction } from 'nango';

function is404Error(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    if ('status' in err && err.status === 404) return true;
    if ('statusCode' in err && err.statusCode === 404) return true;
    if ('response' in err && typeof err.response === 'object' && err.response !== null) {
        if ('status' in err.response && err.response.status === 404) return true;
    }
    return false;
}

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"'),
    pageIdOrName: z.string().describe('Page ID or name. Example: "canvas-bP8xBdFUGb"'),
    name: z.string().optional().describe('New page name'),
    subtitle: z.string().optional().describe('New page subtitle'),
    iconName: z.string().optional().describe('Icon name for the page'),
    imageUrl: z.string().optional().describe('Custom image URL for the page icon')
});

const UpdateResponseSchema = z.object({
    id: z.string(),
    requestId: z.string()
});

const MutationStatusSchema = z.object({
    completed: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    requestId: z.string(),
    completed: z.boolean()
});

const action = createAction({
    description: "Update a page's name, subtitle, or icon",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1#tag/Pages/operation/updatePage
        const updateResponse = await nango.put({
            endpoint: `/docs/${encodeURIComponent(input.docId)}/pages/${encodeURIComponent(input.pageIdOrName)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
                ...(input.iconName !== undefined && { iconName: input.iconName }),
                ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl })
            },
            retries: 1
        });

        const update = UpdateResponseSchema.parse(updateResponse.data);

        let completed = false;
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // https://coda.io/developers/apis/v1#tag/Mutation-Status/operation/getMutationStatus
            // @allowTryCatch: Coda removes mutation status records quickly; 404 means the mutation already finished.
            try {
                const statusResponse = await nango.get({
                    endpoint: `/mutationStatus/${encodeURIComponent(update.requestId)}`,
                    retries: 3
                });

                const status = MutationStatusSchema.parse(statusResponse.data);
                if (status.completed) {
                    completed = true;
                    break;
                }
            } catch (_err) {
                if (is404Error(_err)) {
                    completed = true;
                    break;
                }
                throw _err;
            }
        }

        return {
            id: update.id,
            requestId: update.requestId,
            completed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
