import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the playlist.'),
    description: z.string().optional().describe('The description of the playlist.'),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('The privacy status of the playlist.')
});

const ProviderPlaylistSchema = z.object({
    id: z.string(),
    snippet: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    privacyStatus: z.string().optional()
});

const action = createAction({
    description: 'Create a YouTube playlist for the authenticated channel.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            snippet: {
                title: string;
                description?: string;
            };
            status?: {
                privacyStatus?: string;
            };
        } = {
            snippet: {
                title: input.title
            }
        };

        if (input.description !== undefined) {
            requestBody.snippet.description = input.description;
        }

        if (input.privacyStatus !== undefined) {
            requestBody.status = {
                privacyStatus: input.privacyStatus
            };
        }

        // https://developers.google.com/youtube/v3/docs/playlists/insert
        const response = await nango.post({
            endpoint: '/youtube/v3/playlists',
            params: {
                part: 'snippet,status'
            },
            data: requestBody,
            retries: 3
        });

        const providerPlaylist = ProviderPlaylistSchema.parse(response.data);

        return {
            id: providerPlaylist.id,
            ...(providerPlaylist.snippet?.title !== undefined && {
                title: providerPlaylist.snippet.title
            }),
            ...(providerPlaylist.snippet?.description !== undefined && {
                description: providerPlaylist.snippet.description
            }),
            ...(providerPlaylist.status?.privacyStatus !== undefined && {
                privacyStatus: providerPlaylist.status.privacyStatus
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
