import { createAction } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toInvoice, toXeroInvoice } from '../mappers/to-invoice.js';

import type { ProxyConfiguration } from "nango";

import type {
    FailedInvoice,
    ActionErrorResponse} from "../models.js";
import {
    InvoiceActionResponse,
    Anonymous_xero_action_updateinvoice_input
} from "../models.js";

const action = createAction({
    description: "Updates one or more invoices in Xero. To delete an invoice\nthat is in DRAFT or SUBMITTED set the status to DELETED. If an\ninvoice has been AUTHORISED it can't be deleted but you can set\nthe status to VOIDED.",
    version: "2.0.0",

    endpoint: {
        method: "PUT",
        path: "/invoices",
        group: "Invoices"
    },

    input: Anonymous_xero_action_updateinvoice_input,
    output: InvoiceActionResponse,
    scopes: ["accounting.transactions"],

    exec: async (nango, input): Promise<InvoiceActionResponse> => {
        const tenant_id = await getTenantId(nango);

        // Validate the invoices:
        if (!input || !input.length) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `You must pass an array of invoices! Received: ${JSON.stringify(input)}`
            });
        }

        // 1) Invoice id is required
        const invalidInvoices = input.filter((x: any) => !x.id);
        if (invalidInvoices.length > 0) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `The invoice id is required to update the invoice.\nInvalid invoices:\n${JSON.stringify(invalidInvoices, null, 4)}`
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/invoices/#post-invoices
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenant_id
            },
            params: {
                summarizeErrors: 'false'
            },
            data: {
                Invoices: input.map(toXeroInvoice)
            },
            retries: 3
        };

        const res = await nango.post(config);
        const invoices = res.data.Invoices;

        const failedInvoices = invoices.filter((x: any) => x.HasErrors);
        if (failedInvoices.length > 0) {
            await nango.log(
                `Some invoices could not be created in Xero due to validation errors. Note that the remaining invoices (${
                    input.length - failedInvoices.length
                }) were created successfully. Affected invoices:\n${JSON.stringify(failedInvoices, null, 4)}`,
                { level: 'error' }
            );
        }
        const succeededInvoices = invoices.filter((x: any) => !x.HasErrors);

        const response: InvoiceActionResponse = {
            succeededInvoices: succeededInvoices.map(toInvoice),
            failedInvoices: failedInvoices.map(mapFailedXeroInvoice)
        };

        return response;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function mapFailedXeroInvoice(xeroInvoice: any): FailedInvoice {
    return {
        ...toInvoice(xeroInvoice),
        validation_errors: xeroInvoice.ValidationErrors
    };
}
