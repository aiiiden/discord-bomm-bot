import { Message } from "discord.js";
import { AgentModel, ChannelId, ChatRecord } from "./lib";

export function isGeneralChannel(message: Message): boolean {
  return (
    message.channelId === ChannelId.General
    // && !message.member?.permissions.has("Administrator")
  );
}

export function isBastetChannel(message: Message): boolean {
  return (
    message.channelId === ChannelId.BastetChat
    // && !message.member?.permissions.has("Administrator")
  );
}

export function isWakeupCommand(message: Message): boolean {
  return (
    message.content === "!wakeup" &&
    message.member?.permissions.has("Administrator") &&
    message.channelId === ChannelId.BastetChat
  );
}

// 짝수 일자 : BastetP 가 wakeup 이후 처음 응답
// 홀수 일자 : BastetT 가 wakeup 이후 처음 응답
export function whoIsFirst(agentModel: AgentModel): AgentModel {
  const today = new Date();
  const day = today.getDate();
  return day % 2 === 0 ? AgentModel.BastetP : AgentModel.BastetT;
}

export function isMyTurn({
  whoAmI,
  bastetChats,
}: {
  whoAmI: AgentModel;
  bastetChats: ChatRecord[];
}): boolean {
  const firstTalker = whoIsFirst(whoAmI);

  if (bastetChats.length === 0) {
    return firstTalker === whoAmI;
  }

  const lastChatAuthor = bastetChats[bastetChats.length - 1].author;
  console.log("lastChatAuthor", lastChatAuthor);

  if (whoAmI === AgentModel.BastetP) {
    return lastChatAuthor === AgentModel.BastetT;
  }

  if (whoAmI === AgentModel.BastetT) {
    return lastChatAuthor === AgentModel.BastetP;
  }

  return false;
}
