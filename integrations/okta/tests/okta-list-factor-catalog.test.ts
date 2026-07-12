import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-factor-catalog.js';

describe('okta list-factor-catalog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-factor-catalog',
        Model: 'ActionOutput_okta_cc_listfactorcatalog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
