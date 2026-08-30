// Ties authenticated sessions to a stable identity in Rybbit so the analytics
// dashboard shows real names instead of generated anonymous handles. The
// tracking script (app.html) exposes `window.rybbit`; it may be missing when
// the script is blocked, so callers tolerate a no-op.

interface IdentifiableUser {
    id: string;
    name: string;
    email: string;
    discordUsername?: string | null;
    role?: string | null;
}

export function identifyUser(user: IdentifiableUser): void {
    if (window.rybbit?.getUserId() === user.id) return;
    window.rybbit?.identify(user.id, {
        username: user.discordUsername ?? user.name,
        name: user.name,
        email: user.email,
        ...(user.role ? { role: user.role } : {}),
    });
}

export function clearIdentifiedUser(): void {
    if (window.rybbit?.getUserId()) window.rybbit.clearUserId();
}
