// 只导出类型和常量，用于客户端
export * from "./shared/schema";

// 导出服务端专用的 eventManager（通过单独路径访问）
// 不要在这里导出 eventManager，避免在客户端引用数据库模块
