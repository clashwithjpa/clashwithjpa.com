interface TokenValidateResponse {
    "error-codes": string[];
    success: boolean;
    action: string;
    cdata: string;
}

export async function validateCFToken(token: string, secret: string) {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            response: token,
            secret: secret
        })
    });

    const data: TokenValidateResponse = await response.json();

    return {
        // Return the status
        success: data.success,

        // Return the first error if it exists
        error: data["error-codes"]?.length ? data["error-codes"][0] : null
    };
}

export async function getNewAccessToken(url: string, refreshToken: string, clienID: string, clientSecret: string) {
    const resp = await fetch(`${url}/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            client_id: clienID,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken
        }).toString()
    });

    if (resp.ok) {
        return await resp.json();
    } else {
        return null;
    }
}
