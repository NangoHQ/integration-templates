import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/parse-mime-message.js';

describe('mandrill parse-mime-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'parse-mime-message',
        Model: 'ActionOutput_mandrill_parsemimemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
