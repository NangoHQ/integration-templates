import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-image.js';

describe('klaviyo create-image tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-image',
        Model: 'ActionOutput_klaviyo_createimage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
