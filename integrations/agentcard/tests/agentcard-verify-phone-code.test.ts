import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/verify-phone-code.js';

describe('agentcard verify-phone-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'verify-phone-code',
        Model: 'ActionOutput_agentcard_verifyphonecode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
