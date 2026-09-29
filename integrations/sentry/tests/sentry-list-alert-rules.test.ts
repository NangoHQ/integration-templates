import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-alert-rules.js';

describe('sentry list-alert-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-alert-rules',
        Model: 'ActionOutput_sentry_listalertrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
