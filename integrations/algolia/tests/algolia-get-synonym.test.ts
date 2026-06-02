import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-synonym.js';

describe('algolia get-synonym tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-synonym',
        Model: 'ActionOutput_algolia_getsynonym'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
