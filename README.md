# The Golden Path to Ship AI-generated Code Safely: A Hands-on FeatureOps Workshop

## Introducing Example: Unofficial FeatureOps Gift Store

Repository contains a full-stack **TypeScript** demo application that represents eCommerce checkout flow, that
is **steered live by [Unleash](https://www.getunleash.io) feature flags**. Toggle a flag in the Unleash admin UI
for a given environment and watch the application change instantly (across frontend and backend), with no redeployment.

> Feature flags are evaluated against a **cloud-hosted Unleash** instance.
> Self-paced? Start a 14-day free trial (no credit card required): [getunleash.io](https://www.getunleash.io).

It is a deliberately small but realistically structured app: a React.js-based storefront, a Node.js Fastify checkout
backend, and separate, isolated fake payment providers (**PayBro**: already connected, but _old-school_ vendor,
and **Dashed**: a ready to use modern alternative – but not connected yet). Backend integrates with them through a
real redirect-based payment flow.

Demo contains a few feature flags built-in already, but the main goal is to demonstrate the experience of the
application team using a paved golden path to ship code safely. Code is prepared to support either for replacing the
existing payment provider completely or adding an alternative customer journey path allowing to choose a vendor during
the checkout. It's up to you – however, by leveraging AI coding assistant of your choice, we want to make sure
that the code is safe to ship by aligning to **[FeatureOps](https://featureops.io) deliberate best practices**.

## Quick Start

### Requirements

| Tool           | Minimum version  |
|----------------|------------------|
| Node.js        | 22+              |
| Docker Engine  | 24+              |
| Docker Compose | 2.20+            |
| GNU Make       | any              |

Here is a minimal `.env` file for both virtual workshop attendees and self-paced experience workshop experience:

```bash
UNLEASH_PROJECT_NUMBER=<NNN - three digit number that is assigned and visible in the Unleash admin UI as a project name>
VITE_UNLEASH_PROJECT_NUMBER=<As above>

VITE_UNLEASH_URL=<Frontend Unleash API you can find in the Unleash admin UI inside your project settings>
UNLEASH_URL=<Backend Unleash API you can find in the Unleash admin UI inside your project settings>

VITE_UNLEASH_CLIENT_KEY=<Frontend Unleash API token generated for your project for development environment>
VITE_UNLEASH_CLIENT_KEY_PRODUCTION=<Frontend Unleash API token generated for your project for production environment>

UNLEASH_API_TOKEN=<Backend Unleash API token generated for your project for development environment>
UNLEASH_API_TOKEN_PRODUCTION=<Backend Unleash API token generated for your project for production environment>

UNLEASH_MCP_SERVER_URL=<Remote Unleash MCP server URL provided by instructor>
UNLEASH_MCP_PAT_TOKEN=<Personal Access Token created by you in one of the steps>
```

### Virtual hands-on workshop

Go to the [docs/steps/virtual-workshop/README.md](docs/steps/virtual-workshop/README.md) and follow the steps. 

## Contributing and Development

Eventually, everything all details will be in [docs/development.md](docs/development.md), but not at the moment.

## Editions

- _Virtual hands-on workshop_ during [PlatformCon 2026 Flagship Week](https://platformcon.com/sessions/the-golden-path-to-ship-ai-generated-code-safely-a-hands-on-featureops-workshop).

## License

[Apache Licence 2.0](./LICENSE)
