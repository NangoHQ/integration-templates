import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-slide-full-content.js';

describe('google-slides get-slide-full-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-slide-full-content',
        Model: 'ActionOutput_google_slides_getslidefullcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
