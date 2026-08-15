-- Seeds the policy that used to be hardcoded in the web app, so the page isn't
-- blank between deploy and the first admin save. Only fills a policy that has
-- never been written.
INSERT INTO "settings_table" ("id", "privacy_content")
VALUES (1, $md$[email]: support@clashwithjpa.com

## Who we are

JPA operates clashwithjpa.com, the website of the JPA Clash of Clans clan family. We determine what member data this site collects and the purposes for which it is used, and are therefore the data controller for that information. Enquiries and requests concerning your data should be directed to [support@clashwithjpa.com][email].

---

## What we collect

- Discord account information. Signing in provides us with your Discord user ID, username, display name, avatar and email address. Your membership and roles in the JPA Discord server are read separately, by our own Discord bot.
- Clash of Clans account data. The player tags you link, together with in-game statistics retrieved for them — town hall level, donations given and received, clan games participation, capital gold contributions, war weight and current clan.
- Application records. The information you submit when applying to a clan or to a CWL roster, including your clan preferences, together with any notes recorded by clan staff during review.
- Session records. Technical details associated with each sign-in, including network and browser information, so that active sessions can be managed and misuse investigated.
- Activity records. An audit log of administrative actions performed on the site, and request logs for any API key issued to you.

---

## Why we use it, and on what basis

We process this data in our legitimate interests in operating an organised clan community: confirming Discord identity, determining clan and CWL placement, monitoring war and donation performance, maintaining the security of the site, and holding staff accountable for administrative actions. Where you ask us for something specific, such as submitting an application or issuing an API key, the data is processed in order to fulfil that request. We do not use personal data for advertising, we do not sell or otherwise disclose it for commercial purposes, and we do not carry out automated decision-making that produces legal effects for you.

---

## Who else sees it

- Discord — authentication is performed through Discord, and our Discord bot reads role and membership information from the community server.
- Supercell — we query the official Clash of Clans API for the player tags you link.
- Sentry — our error monitoring. When a fault occurs, a report is sent containing the affected page and the technical details of the error.
- Cloudflare — the Turnstile anti-automation check is loaded from Cloudflare when you submit a clan application.
- Our hosting provider — operates the servers and database on which this site runs.

Certain of these providers operate outside the United Kingdom and the EEA. Where that is the case, transfers rely on the safeguards those providers have implemented, such as standard contractual clauses.

---

## How long we keep it

Account details and linked Clash of Clans data are retained for as long as your account remains active. Session records are retained until the session expires. Application records are retained for the season to which they relate, and for a reasonable period afterwards so that placement decisions can be reviewed. Administrative audit logs are retained for longer, as their purpose is accountability: they record which staff member performed which action, and are deliberately preserved when the corresponding account is removed. On deletion of your account we remove your profile and linked game data; audit entries identifying you are retained for that accountability purpose.

---

## Your rights

If you are located in the United Kingdom or the EEA, data protection law entitles you to request a copy of the personal data we hold about you, to have it corrected or erased, to restrict or object to our use of it, and to receive it in a portable format. This includes any notes recorded by clan staff in relation to your application. Requests should be sent to [support@clashwithjpa.com][email], and we will respond within one month. If you are dissatisfied with how we handle a request, you may lodge a complaint with your national supervisory authority; in the United Kingdom this is the Information Commissioner's Office (ico.org.uk).

---

## Visitor statistics

Site usage is measured using analytics software hosted on our own infrastructure, and the resulting statistics are not shared with any external analytics provider. It records the pages visited, the sources visitors arrive from, outbound links followed, and general characteristics such as browser, device type and country. It sets no cookies and does not track visitors across other websites. Rather than storing a persistent identifier, it derives one from a key that is regenerated each day and then discarded, so activity cannot be linked from one day to the next. We do this in our legitimate interest in understanding how the site is used.

---

## Cookies

We use cookies solely to keep you signed in. These are strictly necessary for the site to function, and are therefore set without consent. We set no advertising cookies, and our visitor statistics operate without cookies entirely, which is why no cookie banner is presented.

---

## Changes

We will update this policy when our handling of personal data changes.
$md$)
ON CONFLICT ("id") DO UPDATE
SET "privacy_content" = EXCLUDED."privacy_content"
WHERE "settings_table"."privacy_content" IS NULL;
