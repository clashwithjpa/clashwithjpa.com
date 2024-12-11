import { DISCORD_ID } from "$env/static/private";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
    const SCOPE = "identify+guilds+guilds.members.read";
    const DISCORD_ENDPOINT = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_ID}&redirect_uri=${encodeURIComponent(`${url.origin}/auth/callback`)}&response_type=code&scope=${SCOPE}`;
    return redirect(302, DISCORD_ENDPOINT);
};
