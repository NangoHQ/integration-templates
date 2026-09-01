import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-recording-client-visibility.js';

describe('basecamp set-recording-client-visibility tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-recording-client-visibility',
        Model: 'ActionOutput_basecamp_setrecordingclientvisibility'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
