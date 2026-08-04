import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-security-rules.js';

describe('datadog list-security-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-security-rules',
        Model: 'ActionOutput_datadog_listsecurityrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
