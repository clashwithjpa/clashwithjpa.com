import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies }) => {
    cookies.set("access_token", "", {
        path: "/",
        expires: new Date(0)
    });

    cookies.set("refresh_token", "", {
        path: "/",
        expires: new Date(0)
    });

    cookies.set("user", "", {
        path: "/",
        expires: new Date(0)
    });

    return new Response(JSON.stringify({ message: "Logged out" }), {
        status: 200,
        headers: {
            "Content-Type": "application/json"
        }
    });
};
