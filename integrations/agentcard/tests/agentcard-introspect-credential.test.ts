import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/introspect-credential.js';

describe('agentcard introspect-credential tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'introspect-credential',
        Model: 'ActionOutput_agentcard_introspectcredential'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
