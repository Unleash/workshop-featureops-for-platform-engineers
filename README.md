# The Golden Path to Ship AI-generated Code Safely: A Hands-on FeatureOps Workshop

## Introducing Example: Unofficial FeatureOps Gift Store

Repository contains a full-stack **TypeScript** demo application that represents eCommerce checkout flow, that is **steered live by [Unleash](https://www.getunleash.io) feature flags**. Toggle a flag in the Unleash admin UI for a given environment and watch the application change instantly (across frontend and backend), with no redeployment.

> Feature flags are evaluated against a **cloud-hosted Unleash** instance. Self-paced? Start a 14-day free trial (no credit card required): [Start Free Trial](https://www.getunleash.io).

It is a deliberately small but realistically structured app: a [React.js](https://react.dev)-based storefront, a Node.js [Fastify](https://fastify.dev) checkout backend, and separate, isolated fake payment providers (**[PayBro](./src/payment-providers/paybro)**: already connected, but _old-school_ vendor, and **[Dashed](./src/payment-providers/dashed)**: a ready to use modern alternative – but not connected yet). Backend integrates with them through a real redirect-based payment flow.

Demo contains a few feature flags built-in already, but the main goal is to demonstrate the experience of the application team using a paved golden path to ship code safely. Code is prepared to support either for replacing the existing payment provider completely or adding an alternative customer journey path allowing to choose a vendor during the checkout. It's up to you – however, by leveraging AI coding assistant of your choice, we want to make sure that the code is safe to ship by aligning to **[FeatureOps](https://featureops.io) principles and pillars**.

## Quick Start

### Dependencies

| Tool           | Minimum version | Optional |
|----------------|-----------------|----------|
| Node.js        | ^22.0.0         |          |
| GNU Make       | _any_           |          |
| Docker         | ^29.0.0         | ✅        |
| Docker Compose | ^5.0.0          | ✅        |
| pnpm           | ^11.8.0         | ✅        |

In addition to the above, workshop execution (including _scripts_) requires `git`, `curl`, and `jq` to be installed.

### For the attendees of a virtual hands-on workshop ...

If you want to prepare for the workshop **ahead of time**, `git clone` this repository. Then, inside the cloned repository, run the following command – and follow the instructions printed in the console:

```bash
make workshop-pre-check
```

As an optional step (as the recommended path is to use local _Node.js_ and `pnpm`/`npm`), you can pre-pull all the necessary *Docker* images:

```bash
make docker-pull
```

Then, during the actual workshop you will follow the guidelines from the lecturer – but additionally, all materials are available for you inside this repository. You can follow the steps here: [Virtual Workshop Steps Overview](docs/steps/virtual-workshop/README.md)

### For the users doing this workshop in a self-paced way ...

_Eventually_, this repository will contain all guidelines and instructions to run the same experience on your own, by using the [Unleash](https://www.getunleash.io) _free trial_ version, but _not at the moment_.

## Contributing and Development

_Eventually_, everything all details will be in [docs/development.md](docs/development.md), but _not at the moment_.

## Editions

- _Virtual hands-on workshop_ during [PlatformCon 2026 Flagship Week](https://platformcon.com/sessions/the-golden-path-to-ship-ai-generated-code-safely-a-hands-on-featureops-workshop).

## License

[Apache License 2.0](./LICENSE.md)
