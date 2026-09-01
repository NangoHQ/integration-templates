import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-recording.js';

describe('basecamp archive-recording tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'archive-recording',
        Model: 'ActionOutput_basecamp_archiverecording'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
