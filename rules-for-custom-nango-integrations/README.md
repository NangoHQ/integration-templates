# Nango Integration Best Practices

This directory contains a set of comprehensive guidelines for writing Nango integration scripts. These guidelines serve as a foundation for creating reliable, maintainable, and consistent integration scripts, whether they're being written manually or generated through automated processes.

## Overview

The \`nango-best-practices.mdc\` file in this directory defines a complete set of rules and patterns for developing Nango integrations. These rules are designed to be used by both human developers and automated systems, ensuring consistent high-quality output regardless of how the integration is created.

## Philosophy

Our approach to integration development is built on several key principles:

1. **Consistency First**
   - Every integration should follow the same patterns and conventions
   - Developers should be able to move between integrations seamlessly
   - Automated tools should produce predictable, standardized code

2. **Reliability by Design**
   - Error handling should be comprehensive and consistent
   - Rate limiting and retries should be properly configured
   - Edge cases should be handled gracefully

3. **Developer Experience**
   - Clear patterns for common tasks
   - Comprehensive documentation and examples
   - Tooling support for validation and testing

4. **Maintainability**
   - Code should be self-documenting where possible
   - Complex logic should be well-commented
   - File structure should be predictable and logical

## How to Use

The best practices are formatted as a Cursor-compatible MDC file, making them directly usable in various contexts:

1. **In Cursor IDE**
   - Rules are automatically applied when working in the `nango-integrations/*` directory
   - Get real-time guidance while writing integration code
   - Automated suggestions follow these best practices

2. **As Documentation**
   - Reference for manual integration development
   - Guide for code review processes
   - Training material for new developers

3. **For Automation**
   - Base rules for AI code generation
   - Validation criteria for automated testing
   - Standards for CI/CD processes

## Using the Nango MCP Server

The Nango MCP (Model Context Protocol) server allows Cursor to directly interact with Nango's documentation and capabilities. Here's how to set it up:

1. **Install the Nango MCP Server**
```bash
npx "@mintlify/mcp add nango"
```

2. **Start the MCP Server**
```bash
npm --prefix ~/.mcp/nango start
```

3. **Configure Cursor**
The MCP server will be automatically detected by Cursor. You can verify this by:
- Opening Cursor settings
- Going to the "MCP" section
- Looking for "nango" in the list of available tools

4. **Using the MCP Server**
Once configured, Cursor's AI can automatically:
- Search Nango documentation
- Provide real-time integration guidance
- Suggest best practices for Nango implementations
- Help with OAuth configurations and API integrations

The MCP server acts as a bridge between Cursor and Nango's documentation, allowing for more accurate and context-aware assistance when working with Nango integrations.

For more information about MCP and how it works in Cursor, visit the [Model Context Protocol documentation](https://docs.cursor.com/context/model-context-protocol).

