import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const configured = !!(supabaseUrl && supabaseAnonKey);

if (!configured) {
  console.warn(
    "[mizuki] Supabase 未配置。PUBLIC_SUPABASE_URL 和 PUBLIC_SUPABASE_ANON_KEY 环境变量缺失。\n" +
    "本地开发：请确保 .env 文件存在且包含这两个变量。\n" +
    "Vercel 部署：请在 Vercel 项目 Settings → Environment Variables 中添加这两个变量。"
  );
} else {
  console.log("[mizuki] Supabase 已配置:", supabaseUrl);
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);

export function isSupabaseConfigured(): boolean {
  return configured;
}

/**
 * 获取或生成匿名用户 ID（存储在 localStorage 中，用于区分不同访客）
 */
export function getAnonymousUserId(): string {
  const key = "mizuki-anon-uid";
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(key, uid);
  }
  return uid;
}
