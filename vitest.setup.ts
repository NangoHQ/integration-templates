import { vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';

export class NangoSyncMock {
    dirname: string;
    name: string;
    Model: string;

    lastSyncDate = null;

    log = vi.fn();
    batchSave: ReturnType<typeof vi.fn>;
    batchDelete: ReturnType<typeof vi.fn>;
    getConnection: ReturnType<typeof vi.fn>;
    getMetadata: ReturnType<typeof vi.fn>;
    paginate: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;

    constructor({ dirname, name, Model }: { dirname: string; name: string; Model: string }) {
        this.dirname = dirname;
        this.name = name;
        this.Model = Model;
        this.batchSave = vi.fn(this.getBatchSaveData.bind(this));
        this.batchDelete = vi.fn(this.getBatchDeleteData.bind(this));
        this.getConnection = vi.fn(this.getConnectionData.bind(this));
        this.getMetadata = vi.fn(this.getMetadataData.bind(this));
        this.paginate = vi.fn(this.getProxyPaginateData.bind(this));
        this.get = vi.fn(this.proxyGetData.bind(this));
        this.post = vi.fn(this.proxyPostData.bind(this));
        this.patch = vi.fn(this.proxyPatchData.bind(this));
        this.put = vi.fn(this.proxyPutData.bind(this));
        this.delete = vi.fn(this.proxyDeleteData.bind(this));
    }

    private async getMockFile(fileName: string) {
        const filePath = path.resolve(this.dirname, `../mocks/${fileName}.json`);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            return data;
        } catch (error) {
            throw new Error(`Failed to load mock data from ${filePath}: ${error.message}`);
        }
    }

    private async getBatchSaveData() {
        const data = await this.getMockFile(`${this.name}/batchSave`);
        return data;
    }

    private async getBatchDeleteData() {
        const data = await this.getMockFile(`${this.name}/batchDelete`);
        return data;
    }

    private async getConnectionData() {
        const data = await this.getMockFile(`nango/getConnection`);
        return data;
    }

    private async getMetadataData() {
        const data = await this.getMockFile('nango/getMetadata');
        return data;
    }

    private async *getProxyPaginateData(args: any) {
        const { endpoint: rawEndpoint, method = 'get', paginate } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/${method.toLowerCase()}/proxy/${endpoint}`);

        if (Array.isArray(data)) {
            yield data;
        }
        if (paginate && paginate.response_path) {
            yield data[paginate.response_path];
        } else {
            // if not an array, return the first key
            const keys = Object.keys(data);
            if (keys.length === 1) {
                yield data[keys[0]];
            }
        }
    }

    private async proxyGetData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/get/proxy/${endpoint}`);

        return { data };
    }

    private async proxyPostData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/post/proxy/${endpoint}`);

        return { data };
    }

    private async proxyPatchData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/patch/proxy/${endpoint}`);

        return { data };
    }

    private async proxyPutData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/put/proxy/${endpoint}`);

        return { data };
    }

    private async proxyDeleteData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/delete/proxy/${endpoint}`);

        return { data };
    }
}

globalThis.vitest = {
    NangoSyncMock
};
