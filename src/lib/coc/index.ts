import createClient from 'openapi-fetch';
import type { paths } from './index.d';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const client = createClient<paths>({
	baseUrl: `${publicEnv.PUBLIC_COC_API_BASE_URI}/v1`,
    headers: {
        'Authorization': `Bearer ${privateEnv.COC_API_TOKEN}`,
        "Content-Type": "application/json"
    }
});
