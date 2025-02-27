import type { NangoAction, ExactInvoiceCreateOutput, ExactInvoiceCreateInput } from '../../models';
import type { ResponsePostBody, E0_SalesInvoice, EO_SalesInvoiceLine } from '../types';
import { getUser } from '../helpers/get-user.js';
import { exactInvoiceCreateInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ExactInvoiceCreateInput): Promise<ExactInvoiceCreateOutput> {
    nango.zodValidateInput({ zodSchema: exactInvoiceCreateInputSchema, input });
        })
    };

    const create = await nango.post<ResponsePostBody<E0_SalesInvoice>>({
        endpoint: `/api/v1/${division}/salesinvoice/SalesInvoices`,
        data: body,
        retries: 10
    });

    return {
        id: create.data.d.InvoiceID
    };
}
