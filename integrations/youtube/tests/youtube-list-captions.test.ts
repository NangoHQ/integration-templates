import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-captions.js';

describe('youtube list-captions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-captions',
        Model: 'ActionOutput_youtube_listcaptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
