import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-call-media.js';

describe('gong-oauth add-call-media tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-call-media',
        Model: 'ActionOutput_gong_oauth_addcallmedia'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const output = await nangoMock.getOutput();

        nangoMock.getToken = vi.fn(() => Promise.resolve('mock-token'));
        nangoMock.uncontrolledFetch = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify(output), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );

        const response = await createAction.exec(nangoMock, input);

        expect(response).toEqual(output);
    });
});
