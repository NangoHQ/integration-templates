import { createAction } from "nango";
import type { E0_SalesInvoice, EO_Document, EO_DocumentAttachment, ResponsePostBody } from '../types.js';
import { getUser } from '../helpers/get-user.js';
import { exactInvoiceAttachFileInputSchema } from '../schema.zod.js';

import { ExactInvoiceAttachFileOutput, ExactInvoiceAttachFileInput } from "../models.js";

const action = createAction({
    description: "Uploads a file to ExactOnline and link it to an invoice",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/invoices/attach-file"
    },

    input: ExactInvoiceAttachFileInput,
    output: ExactInvoiceAttachFileOutput,

    exec: async (nango, input): Promise<ExactInvoiceAttachFileOutput> => {
        await nango.zodValidateInput({ zodSchema: exactInvoiceAttachFileInputSchema, input });

        const { division } = await getUser(nango);

        // Create an empty document
        const bodyDocument: EO_Document = {
            Account: input.customerId,
            Subject: input.subject,
            Type: 183 // General Attachment, find the ids in your EO UI > Documents
        };
        const doc = await nango.post<ResponsePostBody<{ ID: string }>>({
            endpoint: `/api/v1/${division}/documents/Documents`,
            data: bodyDocument,
            retries: 3
        });

        const documentId = doc.data.d.ID;

        // Upload the file
        const bodyAttachment: EO_DocumentAttachment = {
            Attachment: input.content,
            Document: documentId,
            FileName: input.filename
        };
        await nango.post<ResponsePostBody<{ ID: string }>>({
            endpoint: `/api/v1/${division}/documents/DocumentAttachments`,
            data: bodyAttachment,
            retries: 3
        });

        // Attach the Document to an Invoice
        const bodyInvoice: Partial<E0_SalesInvoice> = {
            Document: documentId
        };
        await nango.put<ResponsePostBody<E0_SalesInvoice>>({
            endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${input.invoiceId}')`,
            data: bodyInvoice,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
