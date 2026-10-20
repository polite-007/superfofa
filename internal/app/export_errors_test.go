package app

import "testing"

func TestClassifyExportErrorNetworkPauses(t *testing.T) {
	status, reason := classifyExportError("网络异常: proxy timeout")
	if status != "paused" || reason != "network" {
		t.Fatalf("expected paused/network, got %s/%s", status, reason)
	}
}

func TestClassifyExportErrorInvalidKeyFails(t *testing.T) {
	status, reason := classifyExportError("invalid key")
	if status != "failed" || reason != "invalid_key" {
		t.Fatalf("expected failed/invalid_key, got %s/%s", status, reason)
	}
}
