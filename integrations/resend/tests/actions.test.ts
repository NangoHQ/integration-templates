import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';

// Fixtures are OpenAPI examples or synthetic contract samples, never live recordings.

describe('send-email', () => {
    async function setup() {
        const action = (await import('../actions/send-email.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./send-email.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'send-email', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/emails'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('get-email', () => {
    async function setup() {
        const action = (await import('../actions/get-email.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-email.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-email', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/emails/{email_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('list-emails', () => {
    async function setup() {
        const action = (await import('../actions/list-emails.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-emails.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-emails', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/emails'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('cancel-email', () => {
    async function setup() {
        const action = (await import('../actions/cancel-email.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./cancel-email.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'cancel-email', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/emails/{email_id}/cancel'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('list-domains', () => {
    async function setup() {
        const action = (await import('../actions/list-domains.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./list-domains.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-domains', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/domains'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('get-domain', () => {
    async function setup() {
        const action = (await import('../actions/get-domain.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./get-domain.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-domain', Model: 'Output' });
        nango.get.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/domains/{domain_id}'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('create-domain', () => {
    async function setup() {
        const action = (await import('../actions/create-domain.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./create-domain.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-domain', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/domains'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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

describe('verify-domain', () => {
    async function setup() {
        const action = (await import('../actions/verify-domain.js')).default;
        const fixture = JSON.parse(readFileSync(new URL('./verify-domain.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'verify-domain', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        return { action, fixture, nango };
    }

    it('validates the contract and forwards the request through the provider proxy', async () => {
        const { action, fixture, nango } = await setup();
        const input = action.input.parse(fixture.input);
        const output = await action.exec(nango, input);
        expect(action.output.safeParse(output).success).toBe(true);
        expect(output).toMatchObject(fixture.response);
        const endpoint = '/domains/{domain_id}/verify'.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
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
