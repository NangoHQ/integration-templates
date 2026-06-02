import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/render-images.js';

describe('figma render-images tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'render-images',
        Model: 'ActionOutput_figma_renderimages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
