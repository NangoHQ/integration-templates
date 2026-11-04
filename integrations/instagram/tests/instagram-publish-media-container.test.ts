import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/publish-media-container.js';

describe('instagram publish-media-container tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'publish-media-container',
        Model: 'ActionOutput_instagram_publishmediacontainer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
