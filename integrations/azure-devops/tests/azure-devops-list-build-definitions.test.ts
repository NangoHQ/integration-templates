import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-build-definitions.js';

describe('azure-devops list-build-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-build-definitions',
        Model: 'ActionOutput_azure_devops_listbuilddefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
