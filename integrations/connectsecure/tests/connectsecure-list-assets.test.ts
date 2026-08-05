import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-assets.js';

describe('connectsecure list-assets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-assets',
        Model: 'ActionOutput_connectsecure_listassets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
