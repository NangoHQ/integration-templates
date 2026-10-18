import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-page-element-transform.js';

describe('google-slides update-page-element-transform tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-page-element-transform',
        Model: 'ActionOutput_google_slides_updatepageelementtransform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
