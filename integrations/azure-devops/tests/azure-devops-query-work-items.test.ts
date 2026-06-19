import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-work-items.js';

describe('azure-devops query-work-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-work-items',
        Model: 'ActionOutput_azure_devops_queryworkitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
