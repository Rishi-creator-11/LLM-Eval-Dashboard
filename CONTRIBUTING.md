# Contributing to LLM Eval Dashboard

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to LLM Eval Dashboard. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

- Use the [Bug Report](https://github.com/nakshaatraa/llm-eval-dashboard/issues/new?template=bug_report.md) issue template
- Include your browser, OS, and Node.js version
- Provide steps to reproduce the issue
- Include screenshots if applicable

### 💡 Suggesting Features

- Use the [Feature Request](https://github.com/nakshaatraa/llm-eval-dashboard/issues/new?template=feature_request.md) issue template
- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider alternatives you've thought about

### 🔧 Code Contributions

1. Look for issues tagged [`good first issue`](https://github.com/nakshaatraa/llm-eval-dashboard/labels/good%20first%20issue) or [`help wanted`](https://github.com/nakshaatraa/llm-eval-dashboard/labels/help%20wanted)
2. Comment on the issue to let others know you're working on it
3. Fork the repo and create your branch from `main`

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/llm-eval-dashboard.git
cd llm-eval-dashboard

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Add at least one API key

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
```

## Project Structure

```
├── app/           # Next.js App Router pages and API routes
├── components/
│   ├── dashboard/ # Feature-specific components
│   └── ui/        # Reusable design system primitives
├── lib/
│   └── llm/       # LLM client adapters, metrics, datasets
└── docs/          # Documentation and images
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/llm/clients.ts` | Add new LLM providers here |
| `lib/llm/models.ts` | Register new models here |
| `lib/llm/datasets.ts` | Add evaluation datasets here |
| `lib/llm/metrics.ts` | Implement new metrics here |

## Code Style

- **TypeScript** — Strict mode, no `any` unless unavoidable
- **Formatting** — Uses the project's existing code style (2-space indent, semicolons, double quotes for JSX)
- **Naming** — `camelCase` for variables/functions, `PascalCase` for components/types
- **Imports** — Use `@/` path aliases for project imports
- **Components** — Keep components focused and single-responsibility

```bash
# Lint your code before submitting
npm run lint
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Mistral provider support
fix: handle empty response in hallucination metric
docs: update README with new chart screenshots
refactor: extract key rotation into separate module
test: add unit tests for ROUGE-L metric
chore: update dependencies
```

## Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** with clear, focused commits

3. **Test locally** — ensure `npm run build` passes without errors

4. **Update documentation** if you've changed APIs or added features

5. **Open a PR** with:
   - A clear title following conventional commits
   - A description of what changed and why
   - Screenshots for UI changes
   - Link to the related issue (if any)

6. **Address review feedback** — we aim to review PRs within 48 hours

### PR Checklist

- [ ] My code follows the project's code style
- [ ] I've tested my changes locally
- [ ] I've updated the README if needed
- [ ] My changes don't break existing functionality
- [ ] I've added comments for complex logic

---

Thank you for contributing! Every pull request, issue, and suggestion makes this project better. 🙌
