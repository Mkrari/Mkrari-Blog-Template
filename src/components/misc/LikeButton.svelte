<script lang="ts">
  import { onMount } from "svelte";
  import I18nKey from "../../i18n/i18nKey";
  import { i18n } from "../../i18n/translation";
  import { supabase, getAnonymousUserId, isSupabaseConfigured } from "../../lib/supabase";

  export let slug: string;

  let liked = false;
  let count = 0;
  let animating = false;
  let loading = true;
  let userId = "";

  onMount(async () => {
    userId = getAnonymousUserId();

    // Supabase 未配置时直接用 localStorage
    if (!isSupabaseConfigured()) {
      console.warn("[mizuki] Supabase 未配置，使用本地存储模式");
      loadFromLocalStorage();
      loading = false;
      return;
    }

    try {
      const [countRes, userLikeRes] = await Promise.all([
        supabase
          .from("likes")
          .select("count")
          .eq("slug", slug)
          .maybeSingle(),
        supabase
          .from("user_likes")
          .select("id")
          .eq("slug", slug)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (countRes.error) {
        console.warn("[mizuki] 获取点赞数失败:", countRes.error.message, countRes.error);
      }
      if (userLikeRes.error) {
        console.warn("[mizuki] 获取用户点赞状态失败:", userLikeRes.error.message, userLikeRes.error);
      }
      if (countRes.error || userLikeRes.error) {
        throw countRes.error || userLikeRes.error;
      }

      count = countRes.data?.count ?? 0;
      liked = userLikeRes.data !== null;
      console.log(`[mizuki] 文章 ${slug}: count=${count}, liked=${liked}`);
    } catch (err) {
      console.warn("[mizuki] 点赞数据加载失败，使用本地缓存:", err);
      loadFromLocalStorage();
    } finally {
      loading = false;
    }
  });

  function loadFromLocalStorage() {
    const savedLiked = localStorage.getItem(`mizuki-like-${slug}`);
    const savedCount = parseInt(
      localStorage.getItem(`mizuki-like-count-${slug}`) || "0",
      10,
    );
    liked = savedLiked === "true";
    count = Number.isNaN(savedCount) ? 0 : savedCount;
  }

  async function toggleLike() {
    if (animating || loading) return;
    animating = true;

    const prevLiked = liked;
    const prevCount = count;

    // 乐观更新 UI
    liked = !liked;
    count += liked ? 1 : -1;
    if (count < 0) count = 0;

    // Supabase 未配置时使用 localStorage
    if (!isSupabaseConfigured()) {
      saveToLocalStorage();
      setTimeout(() => (animating = false), 500);
      return;
    }

    try {
      if (liked) {
        // === 点赞 ===
        // 1) 先读当前计数
        const { data: current, error: readErr } = await supabase
          .from("likes")
          .select("count")
          .eq("slug", slug)
          .maybeSingle();

        if (readErr) throw readErr;

        const newCount = (current?.count ?? 0) + 1;

        // 2) 写入新计数
        const { error: upsertErr } = await supabase
          .from("likes")
          .upsert({ slug, count: newCount }, { onConflict: "slug" });

        if (upsertErr) throw upsertErr;

        // 3) 记录用户点赞
        const { error: insertErr } = await supabase
          .from("user_likes")
          .insert({ slug, user_id: userId });

        // 23505 = unique violation，说明已经点过赞了，当作成功
        if (insertErr && insertErr.code !== "23505") {
          console.warn("[mizuki] 插入用户点赞记录失败:", insertErr.message, insertErr);
          // 不回滚，计数已经更新成功
        }

        count = newCount;
        console.log(`[mizuki] 点赞成功: ${slug}, count=${newCount}`);
      } else {
        // === 取消点赞 ===
        // 1) 删除用户点赞记录
        const { error: deleteErr } = await supabase
          .from("user_likes")
          .delete()
          .eq("slug", slug)
          .eq("user_id", userId);

        if (deleteErr) throw deleteErr;

        // 2) 更新计数（减 1，最低为 0）
        const { data: current, error: readErr } = await supabase
          .from("likes")
          .select("count")
          .eq("slug", slug)
          .maybeSingle();

        if (readErr) throw readErr;

        const newCount = Math.max((current?.count ?? 1) - 1, 0);

        const { error: upsertErr } = await supabase
          .from("likes")
          .upsert({ slug, count: newCount }, { onConflict: "slug" });

        if (upsertErr) throw upsertErr;

        count = newCount;
        console.log(`[mizuki] 取消点赞成功: ${slug}, count=${newCount}`);
      }
    } catch (err: any) {
      console.warn("[mizuki] 点赞操作失败，回退 UI:", err?.message || err);
      // 回滚 UI
      liked = prevLiked;
      count = prevCount;
      // 离线回退：写入 localStorage
      saveToLocalStorage();
    } finally {
      setTimeout(() => {
        animating = false;
      }, 500);
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem(`mizuki-like-${slug}`, liked.toString());
    localStorage.setItem(`mizuki-like-count-${slug}`, count.toString());
  }
</script>

<button
  class="like-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
         text-sm font-medium transition-all duration-300
         active:scale-95 select-none
         border border-[var(--line-divider)]
         hover:border-rose-300 dark:hover:border-rose-700
         bg-[var(--card-bg)]"
  class:liked
  class:animate-pop={animating}
  class:opacity-50={loading}
  on:click={toggleLike}
  aria-label={liked ? i18n(I18nKey.liked) : i18n(I18nKey.like)}
  title={liked ? i18n(I18nKey.liked) : i18n(I18nKey.like)}
  disabled={loading}
>
  {#if loading}
    <span class="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
    <span class="text-black/30 dark:text-white/30 text-sm">{i18n(I18nKey.like)}</span>
  {:else}
    <svg
      class="like-icon w-5 h-5 transition-all duration-300"
      class:liked
      viewBox="0 0 24 24"
      fill={liked ? "currentColor" : "none"}
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
    <span class="text-black/60 dark:text-white/60">
      {#if count > 0}
        {count}
      {:else}
        {i18n(I18nKey.like)}
      {/if}
    </span>
  {/if}
</button>

<style>
  .like-btn {
    cursor: pointer;
  }
  .like-btn:not(:disabled):hover .like-icon:not(.liked) {
    color: #f43f5e;
    transform: scale(1.1);
  }
  .like-btn:disabled {
    cursor: default;
  }
  .like-icon.liked {
    color: #f43f5e;
  }
  .animate-pop .like-icon {
    animation: heartPop 0.5s ease-out;
  }
  @keyframes heartPop {
    0% { transform: scale(1); }
    25% { transform: scale(1.35); }
    50% { transform: scale(0.9); }
    75% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
</style>
