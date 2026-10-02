import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-unsubscribe.js';

describe('mailgun get-unsubscribe tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-unsubscribe',
        Model: 'ActionOutput_mailgun_getunsubscribe'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
