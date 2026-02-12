/**
 * 钉钉用户数据 localStorage 缓存工具
 * 缓存时效: 2小时
 */

import { RequiredAttendee } from "@/storage/database/shared/schema";

const CACHE_KEY = "dingtalk_users_cache";
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时（毫秒）

interface DingTalkCacheData {
  data: RequiredAttendee[];
  timestamp: number;
  expiresAt: number;
}

/**
 * 检查 localStorage 是否可用
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取缓存的钉钉用户列表
 * @returns 缓存的用户列表，如果缓存不存在或已过期则返回 null
 */
export function getCachedDingTalkUsers(): RequiredAttendee[] | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const cacheData: DingTalkCacheData = JSON.parse(cached);
    const now = Date.now();

    // 检查缓存是否过期
    if (now > cacheData.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error("读取钉钉用户缓存失败:", error);
    // 清除损坏的缓存
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * 设置钉钉用户列表到缓存
 * @param users 用户列表
 */
export function setCachedDingTalkUsers(users: RequiredAttendee[]): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const now = Date.now();
    const cacheData: DingTalkCacheData = {
      data: users,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("保存钉钉用户缓存失败:", error);
  }
}

/**
 * 清除钉钉用户缓存
 */
export function clearDingTalkCache(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error("清除钉钉用户缓存失败:", error);
  }
}
