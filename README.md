# TypeScript Senior Bootcamp

Coding exercises for the TypeScript Senior Certification bootcamp. Every exercise is independent.

## Setup

You need Node.js 22 or later (see `.nvmrc`) and npm 10 or later.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The links at the top of every page switch between exercises.

## How an exercise works

| File | What it is |
| --- | --- |
| `N-begin.html`, `src/N-begin.ts` | Your starting point: this is the file you edit |
| `N-end.html`, `src/N-end.ts` | The reference solution |
| `src/_internal/` | Helpers and data. You do not need to modify these files |
| `tests/N.test.ts` | Runtime tests |
| `tests/N.test-d.ts` | Type tests, checked by the compiler |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the exercise pages. Type errors in the exercise you have open, and errors thrown while running, appear in a red panel above the scene as you save |
| `npm run typecheck` | Type checks your code in `src/` in strict mode |
| `npm test` | Runs the runtime tests and the type tests against your `src/N-begin.ts` |
| `npm run test:solution` | Runs the same tests against the reference solutions |
| `npm run check:6` | Exercise 6 only: checks your file with `isolatedDeclarations` and prints the compiler's counters |

The code is checked with TypeScript 7 and `strict` enabled.
