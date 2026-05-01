import { z } from 'zod';
import { createAction } from 'nango';

const LocalizationSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the video to update. Example: "dQw4w9WgXcQ"'),
    snippet: z
        .object({
            title: z.string().optional().describe('The title of the video.'),
            description: z.string().optional().describe('The description of the video.'),
            tags: z.array(z.string()).optional().describe('Tags associated with the video.'),
            categoryId: z.string().optional().describe('The category ID for the video.'),
            defaultLanguage: z.string().optional().describe('The default language of the video.')
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('The privacy status of the video.'),
            license: z.enum(['youtube', 'creativeCommon']).optional().describe('The license of the video.'),
            embeddable: z.boolean().optional().describe('Whether the video can be embedded.'),
            publicStatsViewable: z.boolean().optional().describe('Whether the public can view video statistics.'),
            publishAt: z.string().optional().describe('Scheduled publish time (ISO 8601). Requires privacyStatus to be private.'),
            selfDeclaredMadeForKids: z.boolean().optional().describe('Whether the video is self-declared as made for kids.'),
            containsSyntheticMedia: z.boolean().optional().describe('Whether the video contains synthetic media.')
        })
        .optional(),
    localizations: z.record(z.string(), LocalizationSchema).optional().describe('Localized titles and descriptions by language code.'),
    recordingDetails: z
        .object({
            recordingDate: z.string().optional().describe('The date the video was recorded (ISO 8601).')
        })
        .optional()
});

const ProviderVideoSchema = z.object({
    id: z.string(),
    snippet: z
        .object({
            title: z.string(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            categoryId: z.string().optional(),
            defaultLanguage: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional(),
            license: z.string().optional(),
            embeddable: z.boolean().optional(),
            publicStatsViewable: z.boolean().optional(),
            publishAt: z.string().optional(),
            selfDeclaredMadeForKids: z.boolean().optional(),
            containsSyntheticMedia: z.boolean().optional()
        })
        .optional(),
    localizations: z.record(z.string(), LocalizationSchema).optional(),
    recordingDetails: z
        .object({
            recordingDate: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    snippet: z
        .object({
            title: z.string(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            categoryId: z.string().optional(),
            defaultLanguage: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional(),
            license: z.string().optional(),
            embeddable: z.boolean().optional(),
            publicStatsViewable: z.boolean().optional(),
            publishAt: z.string().optional(),
            selfDeclaredMadeForKids: z.boolean().optional(),
            containsSyntheticMedia: z.boolean().optional()
        })
        .optional(),
    localizations: z.record(z.string(), LocalizationSchema).optional(),
    recordingDetails: z
        .object({
            recordingDate: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update YouTube video metadata for an owned video.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-video',
        group: 'Videos'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the parts parameter based on which fields are provided
        const parts: string[] = ['id'];
        if (input.snippet) {
            parts.push('snippet');
        }
        if (input.status) {
            parts.push('status');
        }
        if (input.localizations) {
            parts.push('localizations');
        }
        if (input.recordingDetails) {
            parts.push('recordingDetails');
        }

        const requestBody: Record<string, unknown> = {
            id: input.id
        };

        // YouTube videos.update replaces the entire part — not a patch.
        // Fetch the current snippet first so required fields (title, categoryId)
        // are preserved when the caller omits them.
        if (input.snippet) {
            const currentResponse = await nango.get({
                endpoint: '/youtube/v3/videos',
                params: { part: 'snippet', id: input.id },
                retries: 3
            });
            const cs = currentResponse.data?.items?.[0]?.snippet ?? {};
            // Build merged snippet with stable key order: title, description, tags, categoryId, defaultLanguage
            const mergedSnippet: Record<string, unknown> = {};
            mergedSnippet['title'] = input.snippet.title ?? cs.title;
            const description = input.snippet.description !== undefined ? input.snippet.description : cs.description;
            if (description !== undefined) mergedSnippet['description'] = description;
            const tags = input.snippet.tags !== undefined ? input.snippet.tags : cs.tags;
            if (tags !== undefined) mergedSnippet['tags'] = tags;
            const categoryId = input.snippet.categoryId !== undefined ? input.snippet.categoryId : cs.categoryId;
            if (categoryId !== undefined) mergedSnippet['categoryId'] = categoryId;
            const defaultLanguage = input.snippet.defaultLanguage !== undefined ? input.snippet.defaultLanguage : cs.defaultLanguage;
            if (defaultLanguage !== undefined) mergedSnippet['defaultLanguage'] = defaultLanguage;
            requestBody['snippet'] = mergedSnippet;
        }
        if (input.status) {
            requestBody['status'] = input.status;
        }
        if (input.localizations) {
            requestBody['localizations'] = input.localizations;
        }
        if (input.recordingDetails) {
            requestBody['recordingDetails'] = input.recordingDetails;
        }

        // https://developers.google.com/youtube/v3/docs/videos/update
        const response = await nango.put({
            endpoint: '/youtube/v3/videos',
            params: {
                part: parts.join(',')
            },
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Video not found or update failed',
                videoId: input.id
            });
        }

        const providerVideo = ProviderVideoSchema.parse(response.data);

        type SnippetOutput = {
            title: string;
            description?: string;
            tags?: string[];
            categoryId?: string;
            defaultLanguage?: string;
        };

        type StatusOutput = {
            privacyStatus?: string;
            license?: string;
            embeddable?: boolean;
            publicStatsViewable?: boolean;
            publishAt?: string;
            selfDeclaredMadeForKids?: boolean;
            containsSyntheticMedia?: boolean;
        };

        type RecordingOutput = {
            recordingDate?: string;
        };

        type LocalizationOutput = {
            title?: string | undefined;
            description?: string | undefined;
        };

        type OutputResult = {
            id: string;
            snippet?: SnippetOutput;
            status?: StatusOutput;
            localizations?: Record<string, LocalizationOutput>;
            recordingDetails?: RecordingOutput;
        };

        const result: OutputResult = {
            id: providerVideo.id
        };

        if (providerVideo.snippet) {
            const snippetResult: SnippetOutput = {
                title: providerVideo.snippet.title
            };
            if (providerVideo.snippet.description !== undefined) {
                snippetResult.description = providerVideo.snippet.description;
            }
            if (providerVideo.snippet.tags !== undefined) {
                snippetResult.tags = providerVideo.snippet.tags;
            }
            if (providerVideo.snippet.categoryId !== undefined) {
                snippetResult.categoryId = providerVideo.snippet.categoryId;
            }
            if (providerVideo.snippet.defaultLanguage !== undefined) {
                snippetResult.defaultLanguage = providerVideo.snippet.defaultLanguage;
            }
            result.snippet = snippetResult;
        }

        if (providerVideo.status) {
            const statusResult: StatusOutput = {};
            if (providerVideo.status.privacyStatus !== undefined) {
                statusResult.privacyStatus = providerVideo.status.privacyStatus;
            }
            if (providerVideo.status.license !== undefined) {
                statusResult.license = providerVideo.status.license;
            }
            if (providerVideo.status.embeddable !== undefined) {
                statusResult.embeddable = providerVideo.status.embeddable;
            }
            if (providerVideo.status.publicStatsViewable !== undefined) {
                statusResult.publicStatsViewable = providerVideo.status.publicStatsViewable;
            }
            if (providerVideo.status.publishAt !== undefined) {
                statusResult.publishAt = providerVideo.status.publishAt;
            }
            if (providerVideo.status.selfDeclaredMadeForKids !== undefined) {
                statusResult.selfDeclaredMadeForKids = providerVideo.status.selfDeclaredMadeForKids;
            }
            if (providerVideo.status.containsSyntheticMedia !== undefined) {
                statusResult.containsSyntheticMedia = providerVideo.status.containsSyntheticMedia;
            }
            result.status = statusResult;
        }

        if (providerVideo.localizations) {
            result.localizations = providerVideo.localizations;
        }

        if (providerVideo.recordingDetails) {
            const recordingResult: RecordingOutput = {};
            if (providerVideo.recordingDetails.recordingDate !== undefined) {
                recordingResult.recordingDate = providerVideo.recordingDetails.recordingDate;
            }
            result.recordingDetails = recordingResult;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
