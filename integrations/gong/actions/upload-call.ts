import { z } from 'zod';
import { createAction } from 'nango';

const PartyInputSchema = z.object({
    speakerId: z.string().describe('Unique identifier for this speaker within the call. Example: "s1"'),
    emailAddress: z.string().describe('Email address of the party. Example: "user@example.com"'),
    affiliation: z.enum(['Internal', 'External']).describe('Whether the party is internal or external to the organization'),
    name: z.string().optional().describe('Name of the party. Example: "John Doe"'),
    userId: z.string().optional().describe('Gong user ID for internal parties. Example: "7254376376091929519"')
});

const InputSchema = z.object({
    clientUniqueId: z.string().describe('Unique identifier for this call from the client system. Example: "call-123"'),
    actualStart: z.string().describe('When the call started in ISO 8601 UTC format. Example: "2026-06-11T10:00:00Z"'),
    direction: z.enum(['Inbound', 'Outbound']).describe('Direction of the call'),
    primaryUser: z.string().describe('Gong user ID of the primary user for this call. Example: "7254376376091929519"'),
    parties: z.array(PartyInputSchema).describe('List of parties participating in the call'),
    title: z.string().optional().describe('Title of the call. Example: "Discovery call with Acme"'),
    scheduledStart: z.string().optional().describe('Scheduled start time in ISO 8601 UTC format. Example: "2026-06-11T10:00:00Z"'),
    duration: z.number().optional().describe('Duration of the call in seconds. Example: 1800')
});

const ProviderResponseSchema = z.object({
    callId: z.string().describe('Gong-generated call ID. Example: "123456789"'),
    requestId: z.string().optional().describe('Request ID for tracking. Example: "4al018gzaztcr8nbukw"'),
    url: z.string().optional().describe('URL to view the call in Gong. Example: "https://app.gong.io/call?id=123456789"')
});

const OutputSchema = z.object({
    callId: z.string().describe('Gong-generated call ID. Example: "123456789"'),
    requestId: z.string().optional().describe('Request ID for tracking. Example: "4al018gzaztcr8nbukw"'),
    url: z.string().optional().describe('URL to view the call in Gong. Example: "https://app.gong.io/call?id=123456789"')
});

const action = createAction({
    description: 'Create a call record in Gong from an external telephony or recording system (step 1 of the two-step ingestion flow)',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-call',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parties = input.parties.map((party) => {
            const mapped: {
                speakerId: string;
                emailAddress: string;
                affiliation: string;
                name?: string;
                userId?: string;
            } = {
                speakerId: party.speakerId,
                emailAddress: party.emailAddress,
                affiliation: party.affiliation
            };
            if (party.name !== undefined) {
                mapped.name = party.name;
            }
            if (party.userId !== undefined) {
                mapped.userId = party.userId;
            }
            return mapped;
        });

        const body: {
            clientUniqueId: string;
            actualStart: string;
            direction: string;
            primaryUser: string;
            parties: Array<{
                speakerId: string;
                emailAddress: string;
                affiliation: string;
                name?: string;
                userId?: string;
            }>;
            title?: string;
            scheduledStart?: string;
            duration?: number;
        } = {
            clientUniqueId: input.clientUniqueId,
            actualStart: input.actualStart,
            direction: input.direction,
            primaryUser: input.primaryUser,
            parties
        };

        if (input.title !== undefined) {
            body.title = input.title;
        }
        if (input.scheduledStart !== undefined) {
            body.scheduledStart = input.scheduledStart;
        }
        if (input.duration !== undefined) {
            body.duration = input.duration;
        }

        const GongErrorSchema = z.object({
            requestId: z.string().optional(),
            errors: z.array(z.string()).optional()
        });

        const AxiosErrorSchema = z.object({
            response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
            status: z.number().optional()
        });

        // @allowTryCatch nango.post throws on non-2xx; catch 409 to surface a typed recording error.
        let response;
        try {
            // https://help.gong.io/docs/uploading-calls-from-a-non-integrated-telephony-system
            response = await nango.post({
                endpoint: '/v2/calls',
                data: body,
                retries: 3
            });
        } catch (err) {
            const parsedErr = AxiosErrorSchema.safeParse(err);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;
            if (status === 409) {
                const data = parsedErr.success ? parsedErr.data.response?.data : undefined;
                const errorData = GongErrorSchema.safeParse(data);
                throw new nango.ActionError({
                    type: 'recording_not_enabled',
                    message:
                        errorData.success && errorData.data.errors?.[0]
                            ? errorData.data.errors[0]
                            : 'Recording or telephony call import is not enabled for primaryUser',
                    requestId: errorData.success ? errorData.data.requestId : undefined
                });
            }
            throw err;
        }

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected status from Gong: ${response.status}`,
                status: response.status
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            callId: providerResponse.callId,
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId }),
            ...(providerResponse.url !== undefined && { url: providerResponse.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
