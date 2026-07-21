import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/verify-sender-domain.js';

describe('mandrill verify-sender-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'verify-sender-domain',
        Model: 'ActionOutput_mandrill_verifysenderdomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
