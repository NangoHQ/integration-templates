import { z } from 'zod';
import { createAction } from 'nango';

const DataStreamTypeSchema = z.enum(['DATA_STREAM_TYPE_UNSPECIFIED', 'WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', 'IOS_APP_DATA_STREAM']);

const WebStreamDataInputSchema = z.object({
    default_uri: z.string().describe('Domain name of the web app being measured. Example: "https://www.example.com"')
});

const AndroidAppStreamDataInputSchema = z.object({
    package_name: z.string().describe('The package name for the app being measured. Example: "com.example.myandroidapp"')
});

const IosAppStreamDataInputSchema = z.object({
    bundle_id: z.string().describe('The Apple App Store Bundle ID for the app. Example: "com.example.myiosapp"')
});

const InputSchema = z.object({
    property_id: z.string().describe('GA4 property numeric ID. Example: "1234"'),
    type: DataStreamTypeSchema.describe('The type of data stream to create.'),
    display_name: z.string().describe('Human-readable display name for the Data Stream.'),
    web_stream_data: WebStreamDataInputSchema.optional().describe('Data specific to web streams. Required when type is WEB_DATA_STREAM.'),
    android_app_stream_data: AndroidAppStreamDataInputSchema.optional().describe(
        'Data specific to Android app streams. Required when type is ANDROID_APP_DATA_STREAM.'
    ),
    ios_app_stream_data: IosAppStreamDataInputSchema.optional().describe('Data specific to iOS app streams. Required when type is IOS_APP_DATA_STREAM.')
});

const WebStreamDataSchema = z.object({
    measurementId: z.string().optional(),
    firebaseAppId: z.string().optional(),
    defaultUri: z.string().optional()
});

const AndroidAppStreamDataSchema = z.object({
    firebaseAppId: z.string().optional(),
    packageName: z.string().optional()
});

const IosAppStreamDataSchema = z.object({
    firebaseAppId: z.string().optional(),
    bundleId: z.string().optional()
});

const DataStreamSchema = z.object({
    name: z.string().optional(),
    type: DataStreamTypeSchema.optional(),
    displayName: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    webStreamData: WebStreamDataSchema.optional(),
    androidAppStreamData: AndroidAppStreamDataSchema.optional(),
    iosAppStreamData: IosAppStreamDataSchema.optional()
});

const OutputSchema = z.object({
    name: z.string().optional(),
    type: DataStreamTypeSchema.optional(),
    displayName: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    webStreamData: WebStreamDataSchema.optional(),
    androidAppStreamData: AndroidAppStreamDataSchema.optional(),
    iosAppStreamData: IosAppStreamDataSchema.optional()
});

const action = createAction({
    description: 'Create a data stream for a GA4 property.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-data-stream',
        group: 'Data Streams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/analytics.edit'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type DataStreamBody = {
            type: string;
            displayName: string;
            webStreamData?: { defaultUri: string };
            androidAppStreamData?: { packageName: string };
            iosAppStreamData?: { bundleId: string };
        };

        const body: DataStreamBody = {
            type: input.type,
            displayName: input.display_name
        };

        if (input.web_stream_data !== undefined) {
            body.webStreamData = {
                defaultUri: input.web_stream_data.default_uri
            };
        }

        if (input.android_app_stream_data !== undefined) {
            body.androidAppStreamData = {
                packageName: input.android_app_stream_data.package_name
            };
        }

        if (input.ios_app_stream_data !== undefined) {
            body.iosAppStreamData = {
                bundleId: input.ios_app_stream_data.bundle_id
            };
        }

        // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/create
        const response = await nango.post({
            endpoint: `/v1beta/properties/${encodeURIComponent(input.property_id)}/dataStreams`,
            data: body,
            baseUrlOverride: 'https://analyticsadmin.googleapis.com',
            retries: 3
        });

        const dataStream = DataStreamSchema.parse(response.data);

        return {
            ...(dataStream.name !== undefined && { name: dataStream.name }),
            ...(dataStream.type !== undefined && { type: dataStream.type }),
            ...(dataStream.displayName !== undefined && { displayName: dataStream.displayName }),
            ...(dataStream.createTime !== undefined && { createTime: dataStream.createTime }),
            ...(dataStream.updateTime !== undefined && { updateTime: dataStream.updateTime }),
            ...(dataStream.webStreamData !== undefined && { webStreamData: dataStream.webStreamData }),
            ...(dataStream.androidAppStreamData !== undefined && { androidAppStreamData: dataStream.androidAppStreamData }),
            ...(dataStream.iosAppStreamData !== undefined && { iosAppStreamData: dataStream.iosAppStreamData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
