"use server";

import { encrypt } from "@/services/crypto";

export async function encryptPassword(plaintext: string): Promise<string> {
  return encrypt(plaintext);
}
