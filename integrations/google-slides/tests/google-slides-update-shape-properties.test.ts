import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-shape-properties.js';

describe('google-slides update-shape-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-shape-properties',
        Model: 'ActionOutput_google_slides_updateshapeproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
