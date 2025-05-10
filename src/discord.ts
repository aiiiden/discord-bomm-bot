import { Client, GatewayIntentBits } from "discord.js";
import { AgentModel, botConfig } from "./lib";

export function getDiscordClient({ agentModel }: { agentModel: AgentModel }) {
  if (Object.values(AgentModel).includes(agentModel) === false) {
    throw new Error(`Invalid agent model: ${agentModel}`);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  async function login() {
    try {
      const discordToken = botConfig[agentModel].discordToken;
      await client.login(discordToken);
    } catch (error) {
      console.error("Failed to login:", error);
      console.log("Retrying in 5 seconds...");
      setTimeout(login, 5000);
    }
  }

  return {
    client,
    login,
  };
}
