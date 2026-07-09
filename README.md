# The Golden Path to Ship AI-generated Code Safely: A Hands-on FeatureOps Workshop

## Introducing Example: Unofficial FeatureOps Gift Store

This repository contains a full-stack demo application that represents a typical eCommerce checkout flow, **steered live by [Unleash](https://www.getunleash.io) feature flags**. Toggle a flag in the Unleash admin UI and watch the application change instantly (across frontend and backend), with no redeployment.

> Feature flags are evaluated against a **cloud-hosted Unleash** instance. Self-paced workshop? Start a 14-day free trial (no credit card required): [Start Free Trial](https://www.getunleash.io).

It is a deliberately small but realistically structured app:

- a [React.js](https://react.dev)-based storefront
- a Node.js [Fastify](https://fastify.dev) checkout backend
- isolated fake payment providers integrated via redirect-based payment flow:
  - **[PayBro](./src/payment-providers/paybro)**: already connected, but _old-school_ vendor
  - **[Dashed](./src/payment-providers/dashed)**: a ready to use modern alternative – but not connected yet

The demo contains a few feature flags built-in already, but the main goal is to demonstrate the experience of the application team using a paved golden path to ship code safely. The application code is prepared to support, either for replacing the existing payment provider completely or adding an alternative customer journey path allowing to choose a vendor during the checkout. It's up to you. However, by leveraging your preferred AI coding assistant, we want to make sure that the code is safe to ship by aligning to **[FeatureOps](https://featureops.io) principles and pillars**.

## Quick Start

### Dependencies

| Tool           | Minimum version | Required? |
| -------------- | --------------- | --------- |
| Node.js        | ^22.0.0         | ✅        |
| GNU Make       | _any_           | ✅        |
| Docker         | ^29.0.0         |           |
| Docker Compose | ^5.0.0          |           |
| pnpm           | ^11.8.0         |           |

In addition to the above, you'll need `git`, `curl`, and `jq` too.

### For the attendees of a virtual hands-on workshop

If you want to prepare for the workshop **ahead of time**, `git clone` this repository. Then, inside the cloned repository, run the following command – and follow the instructions printed in the console:

```bash
make workshop-pre-check
```

As an optional step if you're planning to use Docker, you can pre-pull all the necessary _Docker_ images:

```bash
make docker-pull
```

Then, during the actual workshop you will follow the guidelines from the lecturer. Additionally, all materials are available for you in this repository. You can follow the steps here: [Virtual Workshop Steps Overview](docs/steps/virtual-workshop/README.md).

### For the users doing this workshop in a self-paced way

You can run the whole thing on your own, against an [Unleash](https://www.getunleash.io) _free trial_ instance. `make workshop-configure` will offer to create your project, its feature flags, and its SDK tokens for you.

1. Sign up for an Unleash free trial (14 days, **no credit card required**).
2. `git clone` this repository, then run `make workshop-pre-check`.
3. Create a _Personal Access Token_ (_PAT_) in the Unleash.
4. Enable the _remote MCP server_ in the Unleash admin UI.
5. Run `make workshop-configure` and follow the prompts (it asks before creating anything).
6. In another terminal: `make dev`.
7. Run `make workshop-final-check`, then follow the workshop steps from _[Step 4](docs/steps/virtual-workshop/04-wire-mcp.md)_ onward.

The full walkthrough - including what differs from the facilitated workshop, how to use an existing Unleash instance, and how to set things up by hand - is in [the self-paced README file](docs/steps/self-paced/README.md).

## Editions

- _Virtual hands-on workshop_ during [PlatformCon 2026 Flagship Week](https://platformcon.com/sessions/the-golden-path-to-ship-ai-generated-code-safely-a-hands-on-featureops-workshop).

## License

[Apache License 2.0](./LICENSE.md)
