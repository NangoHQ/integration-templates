import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';

// Fixtures are OpenAPI examples or synthetic contract samples, never live recordings.

describe('list-incidents', () => {
    async function setup() {
        const action = (await import('../actions/list-incidents.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-incidents.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-incidents', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/incidents'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('get-incident', () => {
    async function setup() {
        const action = (await import('../actions/get-incident.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-incident.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-incident', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/incidents/{id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('create-incident', () => {
    async function setup() {
        const action = (await import('../actions/create-incident.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-incident.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-incident', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v2/incidents'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('list-follow-ups', () => {
    async function setup() {
        const action = (await import('../actions/list-follow-ups.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-follow-ups.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-follow-ups', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/follow_ups'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('get-follow-up', () => {
    async function setup() {
        const action = (await import('../actions/get-follow-up.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-follow-up.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-follow-up', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/follow_ups/{id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('create-follow-up', () => {
    async function setup() {
        const action = (await import('../actions/create-follow-up.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-follow-up.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-follow-up', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/follow_ups'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('update-follow-up', () => {
    async function setup() {
        const action = (await import('../actions/update-follow-up.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./update-follow-up.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-follow-up', Model: 'Output' });
        nango.put.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/follow_ups/{id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
        expect(nango.put).toHaveBeenCalledOnce();
        expect(nango.put).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
        expect(nango.put).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
    });

    it('propagates provider failures', async () => {
        const { action, fixture, nango } = await setup();
        nango.put.mockRejectedValue(new Error('Provider unavailable'));
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
    });

    it('rejects a malformed provider envelope', async () => {
        const { action, fixture, nango } = await setup();
        nango.put.mockResolvedValue({ data: null });
        await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
    });
});

describe('list-actions', () => {
    async function setup() {
        const action = (await import('../actions/list-actions.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-actions.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-actions', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/actions'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('get-action', () => {
    async function setup() {
        const action = (await import('../actions/get-action.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-action.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-action', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v3/actions/{id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('list-severities', () => {
    async function setup() {
        const action = (await import('../actions/list-severities.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-severities.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-severities', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v1/severities'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('list-incident-statuses', () => {
    async function setup() {
        const action = (await import('../actions/list-incident-statuses.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-incident-statuses.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-incident-statuses', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/v1/incident_statuses'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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
