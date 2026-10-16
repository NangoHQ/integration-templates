import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-drive.js';

describe('microsoft-excel-oauth2-cc get-user-drive tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-drive',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_getuserdrive'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('gets the connected user drive when userId is omitted', async () => {
        const getSpy = vi.spyOn(nangoMock, 'get').mockResolvedValueOnce({
            data: { id: 'current-user-drive' }
        } as Awaited<ReturnType<typeof nangoMock.get>>);

        await expect(createAction.exec(nangoMock, {})).resolves.toEqual({ id: 'current-user-drive' });
        expect(getSpy).toHaveBeenCalledWith({ endpoint: '/v1.0/me/drive', retries: 3 });
    });
});
