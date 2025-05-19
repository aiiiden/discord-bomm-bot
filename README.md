# discord-bomm-bot

A Discord bot for immersive roleplay and policy simulation in the Catarchy Web3 game world. The bot features two AI personas—Bastet-P (emotion-driven) and Bastet-T (logic-driven)—that converse and make proposals based on user chat history, simulating governance and narrative progression in the Catarchy universe.

## Features

- **Dual AI Agents**: Bastet-P (Extreme Humanism) and Bastet-T (Restrained Rationalism) alternate in responding to user and bot messages.
- **Catarchy World Simulation**: Implements the lore, virtues, and narrative seasons of the Catarchy afterlife game, where users are reincarnated as cats.
- **Roleplay & Policy Proposals**: Each AI generates detailed, persona-driven proposals and dialogue, reflecting the game's philosophical and social mechanics.
- **Discord Integration**: Listens to messages in specific channels, manages turn-taking, and responds with immersive, in-character text.
- **Anthropic Claude API**: Uses Anthropic Claude for generating AI responses with custom system prompts.

## Installation

```bash
pnpm install
```

## Usage

Set up your environment variables in a `.env` file (see `src/lib.ts` for required keys: Discord tokens and Anthropic API keys for each agent).

To run Bastet-P (emotion-based AI):

```bash
pnpm run dev-p
```

To run Bastet-T (logic-based AI):

```bash
pnpm run dev-t
```

## Project Structure

- `src/` : Main source code
  - `bastet-p.ts`, `bastet-t.ts`: Entry points for each AI agent
  - `claude.ts`: Claude API integration
  - `discord.ts`: Discord client setup
  - `flags.ts`: Channel and turn logic
  - `lib.ts`: Shared types, config, and system prompt logic
  - `sample.ts`: Sample chat data
- `package.json`: Project metadata and scripts
- `tsconfig.json`: TypeScript configuration

## Contributing

Pull requests and issues are welcome.

## License

MIT License
