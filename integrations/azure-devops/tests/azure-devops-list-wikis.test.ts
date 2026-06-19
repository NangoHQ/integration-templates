import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-wikis.js';

describe('azure-devops list-wikis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-wikis',
        Model: 'ActionOutput_azure_devops_listwikis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
