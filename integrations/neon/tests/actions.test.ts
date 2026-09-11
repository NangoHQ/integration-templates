import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';

// Fixtures are OpenAPI examples or synthetic contract samples, never live recordings.

describe('list-projects', () => {
    async function setup() {
        const action = (await import('../actions/list-projects.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-projects.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-projects', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-project', () => {
    async function setup() {
        const action = (await import('../actions/get-project.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-project.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-project', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('create-project', () => {
    async function setup() {
        const action = (await import('../actions/create-project.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-project.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-project', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-branches', () => {
    async function setup() {
        const action = (await import('../actions/list-branches.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-branches.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-branches', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-branch', () => {
    async function setup() {
        const action = (await import('../actions/get-branch.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-branch', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('create-branch', () => {
    async function setup() {
        const action = (await import('../actions/create-branch.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-branch', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('delete-branch', () => {
    async function setup() {
        const action = (await import('../actions/delete-branch.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./delete-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'delete-branch', Model: 'Output' });
        nango.delete.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.delete).toHaveBeenCalledOnce();
        expect(nango.delete).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-databases', () => {
    async function setup() {
        const action = (await import('../actions/list-databases.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-databases.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-databases', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/databases'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-endpoints', () => {
    async function setup() {
        const action = (await import('../actions/list-endpoints.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-endpoints.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-endpoints', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/get-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-endpoint', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-operation', () => {
    async function setup() {
        const action = (await import('../actions/get-operation.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-operation.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-operation', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/operations/{operation_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-operations', () => {
    async function setup() {
        const action = (await import('../actions/list-operations.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-operations.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-operations', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/operations'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-branch-schema', () => {
    async function setup() {
        const action = (await import('../actions/get-branch-schema.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-branch-schema.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-branch-schema', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/schema'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('compare-branch-schema', () => {
    async function setup() {
        const action = (await import('../actions/compare-branch-schema.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./compare-branch-schema.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'compare-branch-schema', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/compare_schema'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('update-project', () => {
    async function setup() {
        const action = (await import('../actions/update-project.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./update-project.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-project', Model: 'Output' });
        nango.patch.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.patch).toHaveBeenCalledOnce();
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('update-branch', () => {
    async function setup() {
        const action = (await import('../actions/update-branch.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./update-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-branch', Model: 'Output' });
        nango.patch.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.patch).toHaveBeenCalledOnce();
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('set-default-branch', () => {
    async function setup() {
        const action = (await import('../actions/set-default-branch.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./set-default-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'set-default-branch', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/set_as_default'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('create-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/create-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-endpoint', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('update-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/update-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./update-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-endpoint', Model: 'Output' });
        nango.patch.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.patch).toHaveBeenCalledOnce();
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('delete-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/delete-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./delete-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'delete-endpoint', Model: 'Output' });
        nango.delete.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.delete).toHaveBeenCalledOnce();
        expect(nango.delete).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('start-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/start-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./start-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'start-endpoint', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}/start'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('suspend-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/suspend-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./suspend-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'suspend-endpoint', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}/suspend'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('restart-endpoint', () => {
    async function setup() {
        const action = (await import('../actions/restart-endpoint.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./restart-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'restart-endpoint', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/endpoints/{endpoint_id}/restart'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-branch-endpoints', () => {
    async function setup() {
        const action = (await import('../actions/list-branch-endpoints.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-branch-endpoints.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-branch-endpoints', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/endpoints'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('get-database', () => {
    async function setup() {
        const action = (await import('../actions/get-database.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-database.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-database', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/databases/{database_name}'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.get.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('create-database', () => {
    async function setup() {
        const action = (await import('../actions/create-database.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-database.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-database', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/databases'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.post).toHaveBeenCalledOnce();
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.post.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('update-database', () => {
    async function setup() {
        const action = (await import('../actions/update-database.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./update-database.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-database', Model: 'Output' });
        nango.patch.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/databases/{database_name}'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.patch).toHaveBeenCalledOnce();
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.patch).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.patch.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('delete-database', () => {
    async function setup() {
        const action = (await import('../actions/delete-database.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./delete-database.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'delete-database', Model: 'Output' });
        nango.delete.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/projects/{project_id}/branches/{branch_id}/databases/{database_name}'.replace(/\{([^}]+)\}/g, (_, key) =>
            encodeURIComponent(fixture.input[key])
        );
        expect(nango.delete).toHaveBeenCalledOnce();
        expect(nango.delete).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.delete.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});
