import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unpin-message.js';

describe('basecamp unpin-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unpin-message',
        Model: 'ActionOutput_basecamp_unpinmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
