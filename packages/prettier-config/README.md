# @repo/prettier-config

Shared Prettier configuration for the monorepo.

## Installation

```bash
# Install as a workspace dependency
bun add -D @repo/prettier-config@workspace:*
```

## Usage

### Basic Configuration (no plugins)

For packages that don't use Svelte or TailwindCSS (like the server), add to your `package.json`:

```json
{
  "prettier": "@repo/prettier-config"
}
```

### With Svelte and TailwindCSS

For packages that use Svelte and TailwindCSS (like web and ui packages), create a `.prettierrc.mjs` file:

```javascript
import config from '@repo/prettier-config/svelte-tailwind';

export default {
  ...config,
  tailwindStylesheet: './path/to/your/tailwind.css', // Update this path if needed
};
```

### Extending the Configuration

You can also extend either configuration by creating a `.prettierrc.mjs` file:

```javascript
import config from '@repo/prettier-config';
// or
// import config from '@repo/prettier-config/svelte-tailwind';

export default {
  ...config,
  // Your overrides here
  printWidth: 100,
};
```

## Features

- Optimized for TypeScript and JavaScript
- Optional Svelte support with proper parsing
- Optional TailwindCSS class sorting
- Consistent configuration across the monorepo
- Extensible for specific package needs

## Configurations

- **Default export** (`index.js`): Base configuration with no plugins
- **Svelte + TailwindCSS export** (`svelte-tailwind.js`): Includes both Svelte and TailwindCSS plugins