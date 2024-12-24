import { getUserData } from "$lib/auth/user";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ cookies, setHeaders }) => {
    const accessToken = cookies.get("access_token");

    if (!accessToken) {
        return json({ error: "not_authenticated" }, { status: 401 });
    }

    const userData = await getUserData(accessToken);

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    return json(userData);
};
