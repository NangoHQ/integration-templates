import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/describe-global.js';

describe('salesforce describe-global tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'describe-global',
        Model: 'ActionOutput_salesforce_describeglobal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
