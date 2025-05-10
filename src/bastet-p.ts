import { AgentModel, maxChatCount, ChatRecord, botConfig } from "./lib";
import { samples } from "./sample";
import { getDiscordClient } from "./discord";
import {
  isBastetChannel,
  isGeneralChannel,
  isMyTurn,
  isWakeupCommand,
} from "./flags";
import { messageClaudeHandler } from "./claude";

// Settings
const currentAgentModel = AgentModel.BastetP;
let generalChats: ChatRecord[] = [...samples];
let bastetChats: ChatRecord[] = [];

// Flags
let didReady = false;
let didWakeup = false;
let chatSequence = 0;

// Discord client
const { client, login } = getDiscordClient({
  agentModel: currentAgentModel,
});

// Discord client on ready
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  didReady = true;
});

// Discord message event
client.on("messageCreate", async (message) => {
  if (!didReady) return; // Ignore messages before the client is ready

  if (message.author.id === client.user?.id) return; // Ignore bot's own messages

  if (isGeneralChannel(message)) {
    console.log(
      `[General] Chat detected : ${message.content.slice(0, 10)}... (${
        message.author.username
      })`
    );
    generalChats.push({
      author: message.author.username,
      message: message.content,
      date: message.createdAt.toISOString(),
    });
    return;
  }

  if (isBastetChannel(message) && !isWakeupCommand(message)) {
    console.log(
      `[Bastet] Chat detected : ${message.content.slice(0, 10)}... (${
        message.author.username
      })`
    );

    const authorId = message.author.id;

    bastetChats.push({
      author:
        authorId === botConfig[AgentModel.BastetP].discordBotId
          ? AgentModel.BastetP
          : AgentModel.BastetT,

      message: message.content,
      date: message.createdAt.toISOString(),
    });
  }

  if (isWakeupCommand(message)) {
    console.log(`Wakeup command detected!`);
    bastetChats = [];
    didWakeup = true;
  }

  if (!didWakeup) {
    console.log(`Not woken up yet.`);
    return;
  }

  // 1~4초간 랜덤하게 sleep
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000) + 1000)
  );

  if (
    isMyTurn({
      bastetChats,
      whoAmI: currentAgentModel,
    })
  ) {
    if (chatSequence > maxChatCount) {
      console.log(`Max chat count reached. Stopping...`);
      return;
    }

    await message.channel.sendTyping();
    const chat = await messageClaudeHandler({
      agentModel: currentAgentModel,
      userTalksHistory: generalChats,
      guidelines: `
        - Current chat sequence: ${chatSequence}
        - Maximum chat count: ${maxChatCount}
        If this is the last chat, please finish the conversation.
      `,
    });
    message.channel.send(chat);
    chatSequence++;
  }
});

login();
