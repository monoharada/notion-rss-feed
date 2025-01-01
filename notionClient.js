import { Client } from "@notionhq/client";

export function createNotionClient(token) {
  return new Client({ auth: token });
}
