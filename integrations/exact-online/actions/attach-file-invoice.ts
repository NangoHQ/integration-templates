import type { NangoAction, ExactInvoiceAttachFileOutput, ExactInvoiceAttachFileInput } from '../../models';
import type { E0_SalesInvoice, EO_Document, EO_DocumentAttachment, ResponsePostBody } from '../types';
import { getUser } from '../helpers/get-user.js';
import { exactInvoiceAttachFileInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ExactInvoiceAttachFileInput): Promise<ExactInvoiceAttachFileOutput> {
    nango.zodValidateInput({ zodSchema: exactInvoiceAttachFileInputSchema, input });
    const doc = await nango.post<ResponsePostBody<{ ID: string }>>({
        endpoint: `/api/v1/${division}/documents/Documents`,
        data: bodyDocument,
        retries: 10
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
        retries: 10
    });

    // Attach the Document to an Invoice
    const bodyInvoice: Partial<E0_SalesInvoice> = {
        Document: documentId
    };
    await nango.put<ResponsePostBody<E0_SalesInvoice>>({
        endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices(guid'${input.invoiceId}')`,
        data: bodyInvoice,
        retries: 10
    });

    return {
        success: true
    };
}
