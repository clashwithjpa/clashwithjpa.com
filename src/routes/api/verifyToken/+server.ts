import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { TURNSTILE_SECRET_KEY } from "$env/static/private";

interface TokenValidateResponse {
    "error-codes": string[];
    success: boolean;
    action: string;
    cdata: string;
}

export const GET: RequestHandler = async ({ fetch, url }) => {
    const token = url.searchParams.get("token");
    if (!token) {
        return json(
            {
                success: false,
                error: "No token provided."
            },
            {
                status: 400
            }
        );
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            response: token,
            secret: TURNSTILE_SECRET_KEY
        })
    });
    const data: TokenValidateResponse = await response.json();

    return json(
        {
            success: data.success,
            error: data["error-codes"]?.length ? data["error-codes"][0] : null
        },
        {
            status: data.success ? 200 : 400
        }
    );
};
