import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-items.js';

describe('xero list-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-items',
        Model: 'ActionOutput_xero_listitems'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
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
