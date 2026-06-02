import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    propertyId: z.string().describe('GA4 property ID.'),
    dataStreamId: z.string().describe('Data stream ID to update.'),
    displayName: z.string().optional().describe('Human-readable display name for the Data Stream.'),
    webStreamData: z
        .object({
            defaultUri: z.string().optional().describe('Domain name of the web app being measured.')
        })
        .optional()
        .describe('Data specific to web streams.'),
    updateMask: z.string().optional().describe('The list of fields to be updated. If omitted, it will be computed from provided fields.')
});

const WebStreamDataSchema = z.object({
    defaultUri: z.string().optional(),
    measurementId: z.string().optional(),
    firebaseAppId: z.string().optional()
});

const AndroidAppStreamDataSchema = z.object({
    packageName: z.string().optional(),
    firebaseAppId: z.string().optional()
});

const IosAppStreamDataSchema = z.object({
    bundleId: z.string().optional(),
    firebaseAppId: z.string().optional()
});

const DataStreamSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    displayName: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    webStreamData: WebStreamDataSchema.optional(),
    androidAppStreamData: AndroidAppStreamDataSchema.optional(),
    iosAppStreamData: IosAppStreamDataSchema.optional()
});

const OutputSchema = DataStreamSchema;

const action = createAction({
    description: 'Update a GA4 data stream.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-data-stream'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/analytics.edit'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateMaskParts: string[] = [];
        if (input.displayName !== undefined) {
            updateMaskParts.push('displayName');
        }
        if (input.webStreamData?.defaultUri !== undefined) {
            updateMaskParts.push('webStreamData.defaultUri');
        }

        const updateMask = input.updateMask || updateMaskParts.join(',');

        if (!updateMask) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'No fields to update. Provide at least one of displayName or webStreamData.defaultUri, or specify updateMask explicitly.'
            });
        }

        const requestBody: { displayName?: string; webStreamData?: { defaultUri: string } } = {};
        if (input.displayName !== undefined) {
            requestBody.displayName = input.displayName;
        }
        if (input.webStreamData?.defaultUri !== undefined) {
            requestBody.webStreamData = { defaultUri: input.webStreamData.defaultUri };
        }

        const response = await nango.patch({
            // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/patch
            endpoint: `/v1beta/properties/${encodeURIComponent(input.propertyId)}/dataStreams/${encodeURIComponent(input.dataStreamId)}`,
            params: {
                updateMask
            },
            data: requestBody,
            retries: 3,
            baseUrlOverride: 'https://analyticsadmin.googleapis.com'
        });

        const providerDataStream = DataStreamSchema.parse(response.data);
        return providerDataStream;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
