import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-recordings.js';

describe('zoom list-recordings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-recordings',
        Model: 'ActionOutput_zoom_listrecordings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
