<!--
Thanks for the contribution! Fill in what applies and delete what does not.
Keep the title in conventional commit form, e.g. feat(cwl): add league filter
-->

## 📝 What changed

<!-- A short description of the change. What does this do, and why now? -->

## 🔗 Related issues

<!-- Closes #123, Refs #456. Delete if there is none. -->

## 🧩 Type of change

<!-- Tick everything that applies. -->

- [ ] ✨ Feature
- [ ] 🐛 Bug fix
- [ ] ♻️ Refactor, no behaviour change
- [ ] ⚡ Performance
- [ ] 📖 Documentation
- [ ] 🔧 Build, tooling or dependencies
- [ ] 💥 Breaking change

## 📦 Areas touched

- [ ] `apps/web`
- [ ] `apps/server`
- [ ] `packages/*`
- [ ] Database schema or migrations
- [ ] Docker or deployment

## 🧪 How this was tested

<!--
Say what you actually ran, not what should happen. For example:
- Signed in with Discord locally and confirmed the admin button appears
- just migrate against a fresh volume, no errors
-->

## 📸 Screenshots

<!-- UI changes only. Before and after helps a lot. Delete if not applicable. -->

## ⚠️ Things reviewers should know

<!--
Anything that is not obvious from the diff:
- Decisions you were unsure about
- Deliberate trade-offs or known limitations
- Follow-up work you are leaving for later
Delete if there is nothing.
-->

---

<details>
<summary>✅ Checklist</summary>

- [ ] Branched off `main`
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org)
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass locally
- [ ] Database changes ship with the generated migration files
- [ ] New env vars are added to the matching `.env.example`
- [ ] Visual changes follow [DESIGN.md](../DESIGN.md)

</details>
