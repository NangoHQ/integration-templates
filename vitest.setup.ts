import { vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';

class NangoActionMock {
    dirname: string;
    name: string;
    Model: string;

    providerConfigKey = 'nango';

    log = vi.fn();
    ActionError = vi.fn();
    getConnection: ReturnType<typeof vi.fn>;
    getMetadata: ReturnType<typeof vi.fn>;
    paginate: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    proxy: ReturnType<typeof vi.fn>;

    constructor({ dirname, name, Model }: { dirname: string; name: string; Model: string }) {
        this.dirname = dirname;
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
    }

    private async getMockFile(fileName: string, throwOnMissing = true) {
        const filePath = path.resolve(this.dirname, `../mocks/${fileName}.json`);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            return data;
        } catch (error) {
            if (throwOnMissing) {
                throw new Error(`Failed to load mock data from ${filePath}: ${error.message}`);
            }
        }
    }

    public async getBatchSaveData(modelName: string) {
        const data = await this.getMockFile(`${this.name}/${modelName}/batchSave`);
        return data;
    }

    public async getBatchDeleteData(modelName: string) {
        const data = await this.getMockFile(`${this.name}/${modelName}/batchDelete`);
        return data;
    }

    public async getInput() {
        const data = await this.getMockFile(`${this.name}/input`, false);
        return data;
    }

    public async getOutput() {
        const data = await this.getMockFile(`${this.name}/output`);
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
        const data = await this.getMockFile(`nango/${method.toLowerCase()}/proxy/${endpoint}/${this.name}`);

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
    }

    private async proxyGetData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/get/proxy/${endpoint}/${this.name}`);

        return { data };
    }

    private async proxyPostData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/post/proxy/${endpoint}/${this.name}`);

        return { data };
    }

    private async proxyPatchData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/patch/proxy/${endpoint}/${this.name}`);

        return { data };
    }

    private async proxyPutData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/put/proxy/${endpoint}/${this.name}`);

        return { data };
    }

    private async proxyDeleteData(args: any) {
        const { endpoint: rawEndpoint } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/delete/proxy/${endpoint}/${this.name}`);

        return { data };
    }

    private async proxyData(args: any) {
        const { endpoint: rawEndpoint, method = 'get' } = args;
        const endpoint = rawEndpoint.startsWith('/') ? rawEndpoint.slice(1) : rawEndpoint;
        const data = await this.getMockFile(`nango/${method}/proxy/${endpoint}/${this.name}`);

        return { data };
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

globalThis.vitest = {
    NangoActionMock,
    NangoSyncMock
};
