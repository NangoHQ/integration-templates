export interface QueryParams {
    perform_as?: string;
    send_confirmation_email?: boolean;
}

export interface OperationConfig {
    type: OperationType;
    method: 'post' | 'put';
    data: object;
    isDelete?: boolean | undefined;
}

export type OperationType = 'links' | 'sources' | 'stage' | 'tags' | 'archive' | 'other';
