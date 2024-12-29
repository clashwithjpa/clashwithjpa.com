import type { PlayerType } from "./types";

interface SuccessPlayerVerifyToken {
    tag: string;
    token: string;
    status: string; // "ok"
}

interface ErrorPlayerVerifyToken {
    reason: string;
    message: string;
    type: string;
    detail: any;
}

export async function postVerifyToken(baseURI: string, tag: string, token: string, apiToken: string) {
    const response = await fetch(`${baseURI}/v1/players/${encodeURIComponent(tag)}/verifytoken`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token
        })
    });

    if (response.ok) {
        return (await response.json()) as SuccessPlayerVerifyToken;
    } else {
        return (await response.json()) as ErrorPlayerVerifyToken;
    }
}

export async function getPlayerInfo(baseURI: string, tag: string, apiToken: string) {
    const response = await fetch(`${baseURI}/v1/players/${encodeURIComponent(tag)}`, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiToken}`
        }
    });

    return (await response.json()) as PlayerType;
}
