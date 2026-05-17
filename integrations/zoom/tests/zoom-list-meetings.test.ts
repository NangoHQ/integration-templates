import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-meetings.js';

describe('zoom list-meetings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-meetings',
        Model: 'ActionOutput_zoom_listmeetings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
