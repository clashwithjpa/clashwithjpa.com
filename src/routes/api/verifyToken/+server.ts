import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { TURNSTILE_SECRET_KEY, API_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";

interface CFTokenValidateResponse {
    "error-codes": string[];
    success: boolean;
    action: string;
    cdata: string;
}

interface COCTokenValidateResponse {
    tag: string;
    token: string;
    status: string;
}

export const GET: RequestHandler = async ({ fetch, url, cookies }) => {
    if (!cookies.get("access_token")) {
        return json(
            {
                success: false,
                error: "not_authenticated"
            },
            {
                status: 401
            }
        );
    }

    const token = url.searchParams.get("token");
    if (!token) {
        return json(
            {
                success: false,
                error: "No token specified"
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

    const data: CFTokenValidateResponse = await response.json();
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

export const POST: RequestHandler = async ({ fetch, url, cookies }) => {
    if (!cookies.get("access_token")) {
        return json(
            {
                success: false,
                error: "not_authenticated"
            },
            {
                status: 401
            }
        );
    }

    let playerTag = url.searchParams.get("tag") || "";
    const token = url.searchParams.get("token");

    console.log(playerTag, token);

    if (!token) {
        return json(
            {
                success: false,
                error: "No token specified"
            },
            {
                status: 400
            }
        );
    }

    if (!playerTag || !playerTag.startsWith("#")) {
        return json(
            {
                success: false,
                error: "No player tag specified"
            },
            {
                status: 400
            }
        );
    }

    playerTag = playerTag.replace("#", "%23");
    const fetchURL = new URL(`${PUBLIC_API_BASE_URI}/v1/players/${playerTag}/verifytoken`);

    const response = await fetch(fetchURL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            Accept: "application/json"
        },
        body: JSON.stringify({
            token: token
        })
    });

    const data: COCTokenValidateResponse = await response.json();
    console.log(data);

    return json(
        {
            success: data.status === "ok",
            error: data.status === "ok" ? null : "Invalid token"
        },
        {
            status: data.status === "ok" ? 200 : 400
        }
    );
};
