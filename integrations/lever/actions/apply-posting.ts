import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const PersonalInformationSchema = z.object({
    name: z.string(),
    value: z.unknown()
});

const InputSchema = z.object({
    postId: z.string().describe('Posting ID. Example: "abc123"'),
    personalInformation: z.array(PersonalInformationSchema).optional(),
    customQuestions: z.array(z.unknown()).optional(),
    eeoResponses: z.record(z.string(), z.unknown()).optional(),
    urls: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    ipAddress: z.string().optional(),
    timezone: z.string().optional(),
    userAgent: z.string().optional(),
    acceptLanguage: z.string().optional(),
    referer: z.string().optional(),
    source: z.string().optional(),
    consent: z.object({ marketing: z.boolean() }).optional(),
    diversitySurvey: z.record(z.string(), z.unknown()).optional(),
    origin: z.string().optional(),
    send_confirmation_email: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        applicationId: z.string()
    })
});

const OutputSchema = z.object({
    applicationId: z.string()
});

const action = createAction({
    description: 'Submit an application on behalf of a candidate. This endpoint can only be used to submit applications to published or unlisted postings.',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.postId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const putData = {
            ...input
        };

        const path = `/v1/postings/${encodeURIComponent(input.postId)}/apply`;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#apply-to-a-posting
            endpoint: path,
            data: putData,
            retries: 3
        };

        if (input.send_confirmation_email !== undefined) {
            config.params = {
                send_confirmation_email: input.send_confirmation_email ? 'true' : 'false'
            };
        }

        const resp = await nango.post(config);
        const providerResponse = ProviderResponseSchema.parse(resp.data);

        return {
            applicationId: providerResponse.data.applicationId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
