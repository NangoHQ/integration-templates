import type { NangoAction } from '../../models';
import { z } from 'zod';
// Define schema for input validation
const runReportInputSchema = z.object({
    reportName: z.string().min(1, "Report name is required"),
    period: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    additionalParams: z.record(z.any()).optional(),
    pageSize: z.number().min(1).max(2000).default(100).optional()
});

type RunReportInput = z.infer<typeof runReportInputSchema>;

interface IntacctReportData {
    reportid: string;
    title: string;
    rows: any[];
    totals: Record<string, any>;
    format: string;
    completed: boolean;
}

interface IntacctResponse {
    'ia::result': IntacctReportData;
}
export interface OAuth2Credentials {
    type: string;
    access_token: string;
    refresh_token?: string;
    expires_at?: Date | undefined;
}

export interface IntacctJwtPayload {
    iss: string;
    iat: number;
    exp: number;
    clientId: string;
    cnyId: string;
    cnyKey: string;
    userId: string;
    userKey: string;
    sessionId: string;
    entityKey: string;
    entityId: string;
}

/**
 * Decodes a JWT **payload** without verifying the signature. This is adequate for
 * our use-case because the token is obtained directly from Sage Intacct and we
 * only need to read the `sessionId` field.
 */
function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
    // A JWT is made of three parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length < 2) {
        throw new Error('Invalid JWT – expected at least two dot-separated parts');
    }
    const base64Url = parts[1] as string; // the payload is the 2nd part
    // Convert from base64url to regular base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Pad with '=' to make length a multiple of 4
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    console.log('padded', padded)

    const json = Buffer.from(padded, 'base64').toString('utf8');
    console.log('json', JSON.parse(json))
    return JSON.parse(json) as T;
}

export async function getSessionId(nango: NangoAction): Promise<{ sessionId: string, senderId: string, senderPassword: string }> {
    // Retrieve the current connection to access the credentials stored for Sage Intacct
    const connection = await nango.getConnection();
    const accessToken = (connection.credentials as OAuth2Credentials).access_token;
    const decoded = decodeJwtPayload<IntacctJwtPayload>(accessToken);

    const sessionId = decoded.sessionId;
    // TODO: testing out different fields for senderid, senderpassword
    const senderId = decoded.cnyId;
    const senderPassword = decoded.cnyKey;

    if (!sessionId) {
        throw new nango.ActionError({
            message: 'Unable to extract sessionId from Sage Intacct JWT access token.'
        });
    }

    return { sessionId, senderId, senderPassword };
}

export default async function runAction(
    nango: NangoAction,
    input: RunReportInput
): Promise<IntacctResponse> {
    // Validate input using schema
    const parsedInput = runReportInputSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(
                `Invalid input provided to run report: ${error.message} at path ${error.path.join(".")}`,
                { level: "error" }
            );
        }
        throw new nango.ActionError({
            message: "Invalid input provided to run a report",
            details: parsedInput.error.errors
        });
    }

    const validatedInput = parsedInput.data;

    const { sessionId, senderId, senderPassword } = await getSessionId(nango);

    // The connection config is reused to populate the sender credentials in the
    // control block below.

    // Build XML request body
    let requestXml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <control>
        <senderid>${senderId}</senderid>
        <password>${senderPassword}</password>
        <controlid>run-report-${Date.now()}</controlid>
        <uniqueid>false</uniqueid>
        <dtdversion>3.0</dtdversion>
        <includewhitespace>false</includewhitespace>
    </control>
    <operation>
        <authentication>
            <sessionid>${sessionId}</sessionid>
        </authentication>
        <content>
            <function controlid="runReport">
                <get_accountbalancesbydimensions>`;

    // Add reporting period if provided
    if (validatedInput.period) {
        requestXml += `<reportingperiodname>${validatedInput.period}</reportingperiodname>`;
    }

    // Add date range if provided
    if (validatedInput.fromDate && validatedInput.toDate) {
        requestXml += `
            <startdate>
                <year>${validatedInput.fromDate.substring(0, 4)}</year>
                <month>${validatedInput.fromDate.substring(5, 7)}</month>
                <day>${validatedInput.fromDate.substring(8, 10)}</day>
            </startdate>
            <enddate>
                <year>${validatedInput.toDate.substring(0, 4)}</year>
                <month>${validatedInput.toDate.substring(5, 7)}</month>
                <day>${validatedInput.toDate.substring(8, 10)}</day>
            </enddate>`;
    }

    // Add any additional parameters
    if (validatedInput.additionalParams) {
        for (const [key, value] of Object.entries(validatedInput.additionalParams)) {
            requestXml += `<${key}>${value}</${key}>`;
        }
    }

    requestXml += `
                    </get_accountbalancesbydimensions>
                </function>
            </content>
        </operation>
    </control>
</request>`;

    // Configure the request
    const config = {
        endpoint: 'https://api.intacct.com/ia/xml/xmlgw.phtml',
        method: 'POST',
        headers: {
            'Content-Type': 'application/xml'
        },
        data: requestXml,
        retries: 3
    };

    try {
        const response = await nango.uncontrolledFetch({
            url: new URL(config.endpoint),
            method: 'POST',
            headers: config.headers,
            body: config.data
        });
        const responseText = await response.text();
        console.log(responseText)
        return JSON.parse(responseText);
    } catch (error: any) {
        throw new nango.ActionError({
            message: `Error running report: ${error.message}`,
            // details: error
        });
    }
}


// expected request xml
/*
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <control>
        <senderid>{{sender_id}}</senderid>
        <password>{{sender_password}}</password>
        <controlid>{{$timestamp}}</controlid>
        <uniqueid>false</uniqueid>
        <dtdversion>3.0</dtdversion>
        <includewhitespace>false</includewhitespace>
    </control>
    <operation>
        <authentication>
            <sessionid>{{temp_session_id}}</sessionid>
        </authentication>
        <content>
            <function controlid="{{$guid}}">
                <lookup>
                    <object>GLACCTALLOCATION</object>
                </lookup>
            </function>
        </content>
    </operation>
</request>
*/
