import type { ClarifyPaginationMeta } from '../models.js';
import type { ClarifyPaginationMeta as ClarifyPaginationMetaApi } from '../types.js';

export function toPaginationMeta(meta: ClarifyPaginationMetaApi): ClarifyPaginationMeta {
    return {
        totalRecords: meta.total_records,
        totalPages: meta.total_pages,
        offset: meta.offset,
        limit: meta.limit
    };
}
