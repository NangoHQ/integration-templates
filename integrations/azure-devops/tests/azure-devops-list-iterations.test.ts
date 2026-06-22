import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-iterations.js';

describe('azure-devops list-iterations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-iterations',
        Model: 'ActionOutput_azure_devops_listiterations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
