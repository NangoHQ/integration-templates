import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/pin-message.js';

describe('basecamp pin-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'pin-message',
        Model: 'ActionOutput_basecamp_pinmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
