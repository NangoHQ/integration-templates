import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-case-project.js';

describe('datadog create-case-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-case-project',
        Model: 'ActionOutput_datadog_createcaseproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
