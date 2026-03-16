# Durable Showcase

Simple comparison app that visually displays the differences in distributed systems architecture implementations when introducing failure, specifically focused on the advantages of durable execution.

## Features

- Four rockets representing different architecture strategies attempt to complete a 6 phase mission without exploding
- Injectable failures: service availability, network errors, rate limiting, infrastructure outages, etc.
- Chaos Space Monkey for automated chaos in space.

## Strategies Compared

| Strategy | Description |
|----------|-------------|
| **No Retries** | A naive implementation when dealing with distributed systems |
| **Standard Retries (Polly)** | Basic retry policies |
| **Event-Driven (Saga)** | Event driven with DLQ |
| **Temporal (Durable Execution)** | Full durability with Temporal |

## Getting Started

```sh
npm install
npm run dev
```

## Live Demo

https://danteesdale.github.io/durable-showcase

## Built With

- [SvelteKit](https://svelte.dev) + [Svelte 5](https://svelte.dev/docs/svelte/overview)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Shiki](https://shiki.style) for syntax highlighting
