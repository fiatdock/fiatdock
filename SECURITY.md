# Security Policy

## Reporting a vulnerability

Please report security issues **privately** to **osama@fiatdock.com**.
Do **not** open a public GitHub issue for security reports.

Include what you found, where (this package, the `https://fiatdock.com` API,
or the `https://fiatdock.com/mcp` remote endpoint), and steps to reproduce.
You will get an acknowledgement as quickly as possible, normally within a few
business days.

## Scope notes

- This repository contains the public MCP client package only. The FiatDock
  service is non-custodial: conversion, KYC and custody are handled by Transak,
  a licensed provider — FiatDock never holds user funds or keys.
- `AGENT_PRIVATE_KEY` is read from the environment and used only to sign x402
  payments locally; it is never transmitted. Use a dedicated low-balance wallet.

## Supported versions

Only the latest published npm version of `fiatdock-mcp` is supported.
