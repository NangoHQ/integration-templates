import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-slide.js';

describe('google-slides duplicate-slide tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-slide',
        Model: 'ActionOutput_google_slides_duplicateslide'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
