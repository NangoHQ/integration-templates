import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-deal.js';

describe('hubspot get-deal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-deal',
        Model: 'ActionOutput_hubspot_getdeal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
