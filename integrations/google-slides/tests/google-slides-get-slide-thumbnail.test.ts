import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-slide-thumbnail.js';

describe('google-slides get-slide-thumbnail tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-slide-thumbnail',
        Model: 'ActionOutput_google_slides_getslidethumbnail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
