import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-recording.js';

describe('basecamp unarchive-recording tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unarchive-recording',
        Model: 'ActionOutput_basecamp_unarchiverecording'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
