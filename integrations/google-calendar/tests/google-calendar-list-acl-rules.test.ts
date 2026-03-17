import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-acl-rules.js';

describe('google-calendar list-acl-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-acl-rules',
        Model: 'ActionOutput_google_calendar_listaclrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
