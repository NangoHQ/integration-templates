import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-webhook-event-types.js';

describe('instantly list-webhook-event-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-webhook-event-types',
        Model: 'ActionOutput_instantly_listwebhookeventtypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
