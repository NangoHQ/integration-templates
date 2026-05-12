import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-quick-actions.js';

describe('salesforce list-quick-actions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-quick-actions',
        Model: 'ActionOutput_salesforce_listquickactions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
