import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-featured-trend-topics.js';

describe('pinterest get-featured-trend-topics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-featured-trend-topics',
        Model: 'ActionOutput_pinterest_getfeaturedtrendtopics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
