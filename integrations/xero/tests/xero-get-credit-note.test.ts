import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-credit-note.js';

describe('xero get-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-credit-note',
        Model: 'ActionOutput_xero_getcreditnote'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {},
            metadata: {
                tenantId: '59712f8f-45a3-4d45-a705-5d0c9748317e'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
