import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-domain.js';

describe('mailgun get-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-domain',
        Model: 'ActionOutput_mailgun_getdomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
