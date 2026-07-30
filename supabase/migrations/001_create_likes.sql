-- 点赞功能数据库表
-- 在 Supabase SQL Editor 中执行此文件

-- ============================================
-- 1. 点赞计数表：存储每篇文章的总点赞数
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- 启用 Row Level Security
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 任何人可以读取点赞数
CREATE POLICY "Anyone can read likes"
  ON likes FOR SELECT
  USING (true);

-- 任何人可以插入（首次点赞时创建记录）
CREATE POLICY "Anyone can insert likes"
  ON likes FOR INSERT
  WITH CHECK (true);

-- 任何人可以更新点赞数
CREATE POLICY "Anyone can update likes"
  ON likes FOR UPDATE
  USING (true);

-- ============================================
-- 2. 用户点赞记录表：防止同一用户重复点赞
-- ============================================
CREATE TABLE IF NOT EXISTS user_likes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug, user_id)
);

-- 启用 Row Level Security
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- 任何人可以读取点赞记录
CREATE POLICY "Anyone can read user_likes"
  ON user_likes FOR SELECT
  USING (true);

-- 任何人可以插入点赞记录
CREATE POLICY "Anyone can insert user_likes"
  ON user_likes FOR INSERT
  WITH CHECK (true);

-- 任何人可以删除自己的点赞记录
CREATE POLICY "Anyone can delete user_likes"
  ON user_likes FOR DELETE
  USING (true);

-- ============================================
-- 3. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_likes_slug ON user_likes(slug);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);

-- ============================================
-- 4. RPC 函数：原子性地增减点赞数
-- ============================================

-- 增加点赞数（如果记录不存在则先创建）
CREATE OR REPLACE FUNCTION increment_likes(p_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO likes (slug, count) VALUES (p_slug, 1)
  ON CONFLICT (slug) DO UPDATE SET count = likes.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 减少点赞数（最低为 0）
CREATE OR REPLACE FUNCTION decrement_likes(p_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE likes SET count = GREATEST(count - 1, 0)
  WHERE slug = p_slug
  RETURNING count INTO new_count;

  IF new_count IS NULL THEN
    RETURN 0;
  END IF;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
