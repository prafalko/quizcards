# QuizCards

A web application that turns public Quizlet flashcard sets into challenging multiple-choice quizzes.

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

## Project Description

QuizCards solves the common problem of poorly-generated distractors in Quizlet’s built-in quiz mode.  
Given a link to any _public_ Quizlet set, the app imports the flashcards and uses AI to generate three context-appropriate incorrect answers for every card, keeping the quiz both fair and instructive.  
Users can create an account, manage generated quizzes (edit, delete, regenerate answers) and complete quizzes with a clean single-question interface.

## Tech Stack

• **Frontend**: Astro 5, React 19, TypeScript 5, Tailwind CSS 4, Shadcn/ui (Radix-based)  
• **Backend**: Supabase (PostgreSQL, Auth, Storage)  
• **AI**: Google Gemini via Google AI Studio  
• **Tooling**: ESLint, Prettier, Husky + lint-staged  
• **CI/CD**: GitHub Actions  
• **Hosting**: DigitalOcean (Docker image)  
• **Node**: v22.14 (see `.nvmrc`)

## Getting Started Locally

```bash
# 1. Clone the repo
$ git clone https://github.com/yourname/quizcards.git && cd quizcards

# 2. Use the recommended Node version
$ nvm use   # requires nvm, loads v22.14 from .nvmrc

# 3. Install dependencies
$ npm install

# 4. Start the dev server
$ npm run dev
# → open http://localhost:3000
```

Environment variables (e.g. Supabase keys, Gemini API key) should be placed in a `.env` file – see `.env.example` once available.

## Available Scripts

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Start Astro dev server with hot reload |
| `npm run build`    | Build production assets                |
| `npm run preview`  | Preview production build locally       |
| `npm run astro`    | Access Astro CLI directly              |
| `npm run lint`     | Run ESLint over the codebase           |
| `npm run lint:fix` | Run ESLint with `--fix`                |
| `npm run format`   | Format code with Prettier              |

### Manual API Tests

Run manual tests for API endpoints (requires dev server running):

```bash
# Test quiz generation (POST /api/quizzes/generate)
npm run test:post:quizzes:generate

# Test listing quizzes (GET /api/quizzes)
npm run test:get:quizzes

# Test getting quiz by ID (GET /api/quizzes/:id)
npm run test:get:quizzes:id

# Run all API tests in sequence
npm run test:api
```

See [src/test/README.md](src/test/README.md) for detailed testing documentation.

## Project Scope

Minimum Viable Product (MVP):

- User authentication (register, login, logout)
- Import public Quizlet sets by URL
- AI-powered quiz generation (1 correct + 3 plausible incorrect answers)
- Quiz management: list, rename, delete
- Question management: edit, delete, regenerate distractors
- Quiz-taking interface: one question at a time, random order
- Result summary with percentage score and answer breakdown

Out-of-scope for MVP:

- Private Quizlet sets & other import sources (APKG, PDF, etc.)
- Sharing quizzes between accounts
- Mobile applications
- Historical analytics beyond the final score summary

## Project Status

![version](https://img.shields.io/badge/version-0.0.1-blue?style=flat-square)

The project is in active **MVP development** — core features are being built and are not yet production-ready. Contributions are welcome via Pull Requests.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
