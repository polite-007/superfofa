package app

import "strings"

func classifyExportError(msg string) (status string, reason string) {
	lower := strings.ToLower(strings.TrimSpace(msg))

	switch {
	case strings.Contains(lower, "invalid key") || strings.Contains(msg, "无效") && strings.Contains(lower, "key"):
		return "failed", "invalid_key"
	case strings.Contains(lower, "permission") || strings.Contains(msg, "权限"):
		return "failed", "permission_denied"
	case strings.Contains(msg, "请求过快") || strings.Contains(lower, "quota"):
		return "paused", "quota"
	case strings.Contains(msg, "网络") || strings.Contains(lower, "timeout") || strings.Contains(lower, "proxy"):
		return "paused", "network"
	default:
		return "paused", "unknown"
	}
}
