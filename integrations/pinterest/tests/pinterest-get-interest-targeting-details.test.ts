import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-interest-targeting-details.js';

describe('pinterest get-interest-targeting-details tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-interest-targeting-details',
        Model: 'ActionOutput_pinterest_getinteresttargetingdetails'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
