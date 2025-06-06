import { vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { isValidHttpUrl } from '@nangohq/shared';
import { getProvider } from '@nangohq/providers';
import parseLinksHeader from 'parse-link-header';
import get from 'lodash-es/get.js';
import type { Pagination, CursorPagination, LinkPagination, OffsetPagination, OffsetCalculationMethod } from '@nangohq/types';

interface RequestIdentity {
    method: string;
    endpoint: string;
    params: [string, unknown][];
    headers: [string, unknown][];
    data?: unknown;
}

class NangoActionMock {
    dirname: string;
    name: string;
    Model: string;

    providerConfigKey: string;

    log = vi.fn();
    ActionError = vi.fn();
    getConnection: ReturnType<typeof vi.fn>;
    getMetadata: ReturnType<typeof vi.fn>;
    updateMetadata: ReturnType<typeof vi.fn>;
    paginate: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    proxy: ReturnType<typeof vi.fn>;
    getWebhookURL: ReturnType<typeof vi.fn>;
    zodValidateInput: ReturnType<typeof vi.fn>;

    constructor({ dirname, name, Model }: { dirname: string; name: string; Model: string }) {
        this.dirname = dirname;
        this.providerConfigKey = path.basename(path.dirname(dirname));
        this.name = name;
        this.Model = Model;
        this.getConnection = vi.fn(this.getConnectionData.bind(this));
        this.getMetadata = vi.fn(this.getMetadataData.bind(this));
        this.paginate = vi.fn(this.getProxyPaginateData.bind(this));
        this.get = vi.fn(this.proxyGetData.bind(this));
        this.post = vi.fn(this.proxyPostData.bind(this));
        this.patch = vi.fn(this.proxyPatchData.bind(this));
        this.put = vi.fn(this.proxyPutData.bind(this));
        this.delete = vi.fn(this.proxyDeleteData.bind(this));
        this.proxy = vi.fn(this.proxyData.bind(this));
        this.getWebhookURL = vi.fn(() => 'https://example.com/webhook');
        this.zodValidateInput = vi.fn(this.mockZodValidateInput.bind(this));
        this.updateMetadata = vi.fn();
    }

    private async mockZodValidateInput({ input }: { input: any }) {
        return {
            data: input
        };
    }

    private async getMockFile(fileName: string, throwOnMissing: boolean, identity?: ConfigIdentity) {
        const filePath = path.resolve(this.dirname, `../mocks/${fileName}.json`);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            return data;
        } catch (error) {
            if (throwOnMissing) {
                throw new Error(`Failed to load mock data from ${filePath}: ${error.message} ${identity ? JSON.stringify(identity, null, 2) : ''}`);
            }
        }
    }

    private async hashDirExists(hashDir: string) {
        const filePath = path.resolve(this.dirname, `../mocks/${hashDir}/`);

        try {
            await fs.stat(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async getCachedResponse(identity: ConfigIdentity) {
        const dir = `nango/${identity.method}/proxy/${identity.endpoint}/${this.name}/`;
        const hashBasedPath = `${dir}/${identity.requestIdentityHash}`;

        if (await this.hashDirExists(dir)) {
            const data = await this.getMockFile(hashBasedPath, true, identity);
            return data;
        } else {
            return { response: await this.getMockFile(`nango/${identity.method}/proxy/${identity.endpoint}/${this.name}`, true, identity) };
        }
    }

    public async getBatchSaveData(modelName: string) {
        const data = await this.getMockFile(`${this.name}/${modelName}/batchSave`, true);
        return data;
    }

    public async getBatchDeleteData(modelName: string) {
        const data = await this.getMockFile(`${this.name}/${modelName}/batchDelete`, true);
        return data;
    }

    public async getInput() {
        const data = await this.getMockFile(`${this.name}/input`, false);
        return data;
    }

    public async getOutput() {
        const data = await this.getMockFile(`${this.name}/output`, true);
        return data;
    }

    private async getConnectionData() {
        const data = await this.getMockFile(`nango/getConnection`, true);
        return data;
    }

    private async getMetadataData() {
        const data = await this.getMockFile('nango/getMetadata', true);
        return data;
    }

    private async *getProxyPaginateData(args: Configish) {
        const providerConfig = getProvider(this.providerConfigKey);
        if (!providerConfig) {
            throw new Error(`Provider config not found for ${this.providerConfigKey}`);
        }

        args.method = args.method || 'get';

        args.paginate = {
            ...providerConfig.proxy?.paginate,
            ...args.paginate
        };

        const paginateInBody = ['post', 'put', 'patch'].includes(args.method.toLowerCase());
        const updatedBodyOrParams = paginateInBody ? (args.data as Record<string, any>) || {} : args.params || {};

        if (args.paginate['limit']) {
            const limitParameterName = args.paginate.limit_name_in_request!;

            updatedBodyOrParams[limitParameterName] = args.paginate['limit'];
        }

        if (args.paginate?.type === 'cursor') {
            yield* this.cursorPaginate(args, updatedBodyOrParams, paginateInBody);
        } else if (args.paginate?.type === 'link') {
            yield* this.linkPaginate(args, updatedBodyOrParams, paginateInBody);
        } else if (args.paginate?.type === 'offset') {
            yield* this.offsetPaginate(args, updatedBodyOrParams, paginateInBody);
        } else {
            throw new Error(`Invalid pagination type: ${args.paginate?.type}`);
        }
    }

    private async *cursorPaginate(args: Configish, updatedBodyOrParams: Record<string, any>, paginateInBody: boolean) {
        const cursorPagination = args.paginate as CursorPagination;

        let nextCursor: string | number | undefined;
        do {
            if (typeof nextCursor !== 'undefined') {
                updatedBodyOrParams[cursorPagination.cursor_name_in_request] = nextCursor;
            }

            if (paginateInBody) {
                args.data = updatedBodyOrParams;
            } else {
                args.params = updatedBodyOrParams;
            }

            const response = await this.proxyData(args);
            if (!response.headers) {
                // use legacy method for cached responses
                const data = response.data;
                const paginate = args.paginate as Pagination;

                if (Array.isArray(data)) {
                    yield data;
                }
                if (paginate && paginate.response_path) {
                    yield data[paginate.response_path];
                } else {
                    // if not an array, return the first key that is an array
                    const keys = Object.keys(data);
                    for (const key of keys) {
                        if (Array.isArray(data[key])) {
                            yield data[key];
                        }
                    }
                }
                return;
            }

            const responseData = cursorPagination.response_path ? response.data[cursorPagination.response_path] : response.data;

            if (!responseData || !responseData.length) {
                return;
            }

            yield responseData;

            nextCursor = response.data[cursorPagination.cursor_path_in_response];
            if (typeof nextCursor === 'string') {
                nextCursor = nextCursor.trim();
                if (!nextCursor) {
                    nextCursor = undefined;
                }
            } else if (typeof nextCursor !== 'number') {
                nextCursor = undefined;
            }
        } while (typeof nextCursor !== 'undefined');
    }

    private async *linkPaginate(args: Configish, updatedBodyOrParams: Record<string, any>, paginateInBody: boolean) {
        const linkPagination = args.paginate as LinkPagination;

        if (paginateInBody) {
            args.data = updatedBodyOrParams;
        } else {
            args.params = updatedBodyOrParams;
        }

        while (true) {
            const responseish = await this.proxyData(args);

            // if this is a legacy cached response, use the legacy algorithm
            if (!responseish.headers) {
                const data = responseish.data;
                const paginate = args.paginate as Pagination;

                if (Array.isArray(data)) {
                    yield data;
                }
                if (paginate && paginate.response_path) {
                    yield data[paginate.response_path];
                } else {
                    // if not an array, return the first key that is an array
                    const keys = Object.keys(data);
                    for (const key of keys) {
                        if (Array.isArray(data[key])) {
                            yield data[key];
                        }
                    }
                }
                return;
            }

            const data = responseish.data;
            const responseData = linkPagination.response_path ? data[linkPagination.response_path] : data;

            if (!responseData.length) {
                return;
            }

            yield responseData;

            const nextPageLink: string | undefined = this.getNextPageLinkFromBodyOrHeaders(linkPagination, responseish, args.paginate as Pagination);
            if (!nextPageLink) {
                return;
            }

            if (!isValidHttpUrl(nextPageLink)) {
                // some providers only send path+query params in the link so we can immediately assign those to the endpoint
                args.endpoint = nextPageLink;
            } else {
                const url: URL = new URL(nextPageLink);
                args.endpoint = url.pathname + url.search;
            }

            args.params = {};
        }
    }

    private getNextPageLinkFromBodyOrHeaders(linkPagination: LinkPagination, response: Responseish, paginationConfig: Pagination) {
        if (linkPagination.link_rel_in_response_header) {
            const linkHeader = parseLinksHeader(response.headers['link']);
            return linkHeader?.[linkPagination.link_rel_in_response_header]?.url;
        } else if (linkPagination.link_path_in_response_body) {
            return get(response.data, linkPagination.link_path_in_response_body);
        }

        throw Error(`Either 'link_rel_in_response_header' or 'link_path_in_response_body' should be specified for '${paginationConfig.type}' pagination`);
    }

    private async *offsetPaginate(args: Configish, updatedBodyOrParams: Record<string, any>, paginateInBody: boolean) {
        const offsetPagination = args.paginate as OffsetPagination;
        const offsetParameterName: string = offsetPagination.offset_name_in_request;
        const offsetCalculationMethod: OffsetCalculationMethod = offsetPagination.offset_calculation_method || 'by-response-size';

        let offset = offsetPagination.offset_start_value || 0;

        while (true) {
            updatedBodyOrParams[offsetParameterName] = paginateInBody ? offset : String(offset);

            if (paginateInBody) {
                args.data = updatedBodyOrParams;
            } else {
                args.params = updatedBodyOrParams;
            }

            const response = await this.proxyData(args);

            if (!response.headers) {
                // use legacy method for cached responses
                const data = response.data;
                const paginate = args.paginate as Pagination;

                if (Array.isArray(data)) {
                    yield data;
                }
                if (paginate && paginate.response_path) {
                    yield data[paginate.response_path];
                } else {
                    // if not an array, return the first key that is an array
                    const keys = Object.keys(data);
                    for (const key of keys) {
                        if (Array.isArray(data[key])) {
                            yield data[key];
                        }
                    }
                }
                return;
            }

            const responseData = args.paginate?.response_path ? get(response.data, args.paginate?.response_path) : response.data;
            if (!responseData || !responseData.length) {
                return;
            }

            yield responseData;

            if (args.paginate?.limit && responseData.length < args.paginate?.limit) {
                return;
            }

            if (responseData.length < 1) {
                // empty page, no more results
                return;
            }

            if (offsetCalculationMethod === 'per-page') {
                offset++;
            } else {
                offset += responseData.length;
            }
        }
    }

    private async proxyGetData(args: Configish) {
        return this.proxyData({ ...args, method: 'get' });
    }

    private async proxyPostData(args: Configish) {
        return this.proxyData({ ...args, method: 'post' });
    }

    private async proxyPatchData(args: Configish) {
        return this.proxyData({ ...args, method: 'patch' });
    }

    private async proxyPutData(args: Configish) {
        return this.proxyData({ ...args, method: 'put' });
    }

    private async proxyDeleteData(args: Configish) {
        return this.proxyData({ ...args, method: 'delete' });
    }

    private async proxyData(args: Configish) {
        const identity = computeConfigIdentity(args);
        const cached = await this.getCachedResponse(identity);

        return { data: cached.response, headers: cached.headers, status: cached.status };
    }
}
class NangoSyncMock extends NangoActionMock {
    lastSyncDate = null;

    batchSave: ReturnType<typeof vi.fn>;
    batchDelete: ReturnType<typeof vi.fn>;

    constructor({ dirname, name, Model }: { dirname: string; name: string; Model: string }) {
        super({ dirname, name, Model });
        this.batchSave = vi.fn();
        this.batchDelete = vi.fn();
    }
}

const FILTER_HEADERS = ['authorization', 'user-agent', 'nango-proxy-user-agent', 'accept-encoding', 'retries', 'host', 'connection-id', 'provider-config-key'];

interface Configish {
    endpoint: string;
    params: Record<string, string | number>;
    method: string;
    headers?: Record<string, string>;
    paginate?: Partial<CursorPagination> | Partial<LinkPagination> | Partial<OffsetPagination>;
    data: unknown;
}

interface Responseish {
    data: unknown;
    headers: Record<string, string>;
    status: number;
}

interface RequestIdentity {
    method: string;
    endpoint: string;
    params: [string, unknown][];
    headers: [string, unknown][];
    data?: unknown;
}

interface ConfigIdentity {
    method: string;
    endpoint: string;
    requestIdentityHash: string;
    requestIdentity: RequestIdentity;
}

function computeConfigIdentity(config: Configish): ConfigIdentity {
    const method = config.method?.toLowerCase() || 'get';
    const params = sortEntries(Object.entries(config.params || {}));
    const endpoint = config.endpoint.startsWith('/') ? config.endpoint.slice(1) : config.endpoint;

    const dataIdentity = computeDataIdentity(config);

    const filteredHeaders = Object.entries(config.headers || {}).filter(([key]) => !FILTER_HEADERS.includes(key.toLowerCase()));
    sortEntries(filteredHeaders);
    const headers = filteredHeaders;

    const requestIdentity: RequestIdentity = {
        method,
        endpoint,
        params,
        headers,
        data: dataIdentity
    };
    const requestIdentityHash = crypto.createHash('sha1').update(JSON.stringify(requestIdentity)).digest('hex');

    return {
        method,
        endpoint,
        requestIdentityHash,
        requestIdentity
    };
}

function sortEntries(entries: [string, unknown][]): [string, unknown][] {
    return entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function computeDataIdentity(config: Configish): string | undefined {
    const data = config.data;

    if (!data) {
        return undefined;
    }

    let dataString = '';
    if (typeof data === 'string') {
        dataString = data;
    } else if (Buffer.isBuffer(data)) {
        dataString = data.toString('base64');
    } else {
        try {
            dataString = JSON.stringify(data);
        } catch (e) {
            if (e instanceof Error) {
                throw new Error(`Unable to compute request identity: ${e.message}`);
            } else {
                throw new Error('Unable to compute request identity');
            }
        }
    }

    if (dataString.length > 1000) {
        return 'sha1:' + crypto.createHash('sha1').update(dataString).digest('hex');
    } else {
        return dataString;
    }
}

globalThis.vitest = {
    NangoActionMock,
    NangoSyncMock
};
