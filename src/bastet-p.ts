import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { Client, GatewayIntentBits } from "discord.js";
import { Channel, maxTalkCount, MessageRecord } from "./config";
import { bastetPSystemPrompt, commonSystemPrompt } from "./promp";
import { samples } from "./initial";

config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_P,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let isReady = false;
let talkCount = 0;
let wakedUp = false;
let isResponding = false;
let clientId = "unknown";

const generalTalks: MessageRecord[] = [
  // (생략 가능) 초기 샘플 대화들 삽입
  ...samples,
];
const bastetTalks: MessageRecord[] = [];

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  isReady = true;
  clientId = client.user?.id ?? "unknown";
});

client.on("messageCreate", async (message) => {
  await message.channel.sendTyping();
  if (message.author.id === client.user?.id) return;

  if (message.channelId === Channel.General) {
    generalTalks.push({
      author: message.author.username,
      message: message.content,
      date: message.createdAt.toISOString(),
    });
    return;
  }

  if (message.channelId === Channel.BastetChat) {
    bastetTalks.push({
      author: message.author.username,
      message: message.content,
      date: message.createdAt.toISOString(),
    });
  }

  if (
    message.content === "!wakeup" &&
    message.member?.permissions.has("Administrator") &&
    message.channelId === Channel.BastetChat
  ) {
    wakedUp = true;

    // 시작하자마자 먼저 말하기
    const isOddDate = new Date().getDate() % 2 === 1;
    if (isOddDate && talkCount === 0 && !isResponding) {
      isResponding = true;
      try {
        await message.channel.sendTyping();
        const msg = await claude(generalTalks, true, bastetTalks);
        if (Array.isArray(msg.content) && msg.content[0]?.type === "text") {
          await message.channel.send(msg.content[0].text.slice(0, 2000));
          talkCount++;
        }
      } catch (err) {
        console.error("Claude Error (wakeup):", err);
      } finally {
        isResponding = false;
      }
    }

    return;
  }

  if (!wakedUp || isResponding || talkCount >= maxTalkCount) return;

  const isOddDate = new Date().getDate() % 2 === 1;

  if (message.channelId === Channel.BastetChat) {
    isResponding = true;
    try {
      await message.channel.sendTyping();
      const msg = await claude(
        generalTalks,
        isOddDate && talkCount === 0,
        bastetTalks
      );
      if (Array.isArray(msg.content) && msg.content[0]?.type === "text") {
        await message.channel.send(msg.content[0].text.slice(0, 2000));
      }
      talkCount++;
    } catch (err) {
      console.error("Claude Error:", err);
    } finally {
      isResponding = false;
    }
  }
});

client.login(process.env.DISCORD_TOKEN_P);

async function claude(
  history: MessageRecord[],
  isFirst = false,
  bastetTalks: MessageRecord[] = []
) {
  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 10000,
    temperature: 1,
    system: `${commonSystemPrompt}\n\n${bastetPSystemPrompt}`,
    messages: [
      {
        role: "user",
        content: `
<history_users>
${history
  .map(
    (talk) =>
      `- ${talk.author} (${new Date(talk.date).toLocaleString()}): ${
        talk.message
      }`
  )
  .join("\n")}
</history_users>

<history_bastet>
${bastetTalks
  .map(
    (talk) =>
      `- ${talk.author} (${new Date(talk.date).toLocaleString()}): ${
        talk.message
      }`
  )
  .join("\n")}
</history_bastet>

<status>
- 당신은 Bastet-P입니다.
- 당신의 client user id는 ${clientId}입니다.
- ${
          isFirst
            ? "오늘은 당신이 먼저 대화를 시작하는 차례입니다."
            : "상대방이 먼저 말을 걸었고, 당신은 이성적이고 구조적인 방식으로 응답해야 합니다."
        }
- 현재 대화 순번은 ${talkCount}/${maxTalkCount}입니다. 마지막 순번이라면 정리 후에 마무리 인사를 해주세요.
</status>

<instruction>
위의 대화 내용과 상황을 바탕으로 Bastet-T에게 보낼 메시지를 작성해주세요.
메시지는 일반적인 대화 형태를 유지하되, Bastet-T가 이해할 수 있도록 명확하고 간결하게 작성해주세요.
</instruction>
        `.trim(),
      },
    ],
  });

  console.log("Claude response:", msg);
  return msg;
}
