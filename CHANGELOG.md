# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased

Fixed:

1. **lib/server**: Notify client of successful authentication.
1. **lib/socket**: Emit `close` event.

## 0.2.0 - 2024-03-05

Changed:

1. **lib**: Use native `async`/`await`.

Fixed:

1. **chore**: Update dependencies.

## 0.1.0 - 2017-12-21

Added:

1. **lib/socket,client**: Forward errors from underlying WebSocket
1. **lib/client**: Add getter `Client#isOpen`
1. **lib/client**: Pass "context" arguments in `close` event
1. **lib/server**: Add constructor option `ignoreConnReset` (set to `true`!)

Changed:

1. **lib**: Use proper WebSocket close codes
1. **lib/server**: Improve graceful shutdown
1. **script/connect**: Improve exit process of script

## 0.0.0 - 2017-12-19

**Out in the Wild**
