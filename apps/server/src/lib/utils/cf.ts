import { config } from "@/lib/config";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
    try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: config.JPA_TURNSTILE_SECRET_KEY,
                response: token,
            }),
        });
        const data = (await response.json()) as { success: boolean };
        return data.success;
    } catch (error) {
        return false;
    }
}
