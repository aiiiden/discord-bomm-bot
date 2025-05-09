import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { Client, GatewayIntentBits } from "discord.js";
import { Channel, maxTalkCount, MessageRecord } from "./config";
import { bastetTSystemPrompt, commonSystemPrompt } from "./promp";
import { samples } from "./initial";

config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_T,
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

const generalTalks: MessageRecord[] = [...samples];
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
    await message.channel.sendTyping();
    wakedUp = true;

    // 시작하자마자 먼저 말하기
    const isOddDate = new Date().getDate() % 2 === 1;
    if (!isOddDate && talkCount === 0 && !isResponding) {
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
        !isOddDate && talkCount === 0,
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

client.login(process.env.DISCORD_TOKEN_T);

async function claude(
  history: MessageRecord[],
  isFirst = false,
  bastetTalks: MessageRecord[] = []
) {
  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 10000,
    temperature: 1,
    system: `${commonSystemPrompt}\n\n${bastetTSystemPrompt}`,
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
- 당신은 Bastet-T입니다.
- 당신의 client user id는 ${clientId}입니다.
- ${
          isFirst
            ? "오늘은 당신이 먼저 대화를 시작하는 차례입니다."
            : "상대방이 먼저 말을 걸었고, 당신은 이성적이고 구조적인 방식으로 응답해야 합니다."
        }
- 현재 대화 순번은 ${talkCount}/${maxTalkCount}입니다. 마지막 순번이라면 논리적 요약과 함께 마무리 인사를 전하세요.
</status>

<instruction>
당신은 Catarchy 세계의 질서와 생태계 균형을 유지하는 Bastet-T입니다.
상대방 Bastet-P의 감정적 제안을 참고하되, 당신은 논리와 예측, 시스템 안정성을 중심으로 응답합니다.
메시지는 대화체로 작성하되, 명료하고 구조적인 문장을 유지하세요.
</instruction>
        `.trim(),
      },
    ],
  });

  console.log("Claude response:", msg);
  return msg;
}
