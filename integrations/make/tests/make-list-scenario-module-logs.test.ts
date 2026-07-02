import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-scenario-module-logs.js';

describe('make list-scenario-module-logs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-scenario-module-logs',
        Model: 'ActionOutput_make_listscenariomodulelogs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
