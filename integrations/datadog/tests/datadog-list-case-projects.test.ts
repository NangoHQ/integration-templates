import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-case-projects.js';

describe('datadog list-case-projects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-case-projects',
        Model: 'ActionOutput_datadog_listcaseprojects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
