import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/queue-build.js';

describe('azure-devops queue-build tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'queue-build',
        Model: 'ActionOutput_azure_devops_queuebuild'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
