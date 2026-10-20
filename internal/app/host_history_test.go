package app

import (
	"path/filepath"
	"strings"
	"testing"

	"myproject/internal/store"
)

func newHostHistoryTestApp(t *testing.T) *App {
	t.Helper()
	s, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("store.Open failed: %v", err)
	}
	t.Cleanup(func() {
		if err := s.Close(); err != nil {
			t.Fatalf("store.Close failed: %v", err)
		}
	})
	a := NewApp()
	a.store = s
	return a
}

func TestHostHistoryAppRequiresStore(t *testing.T) {
	a := NewApp()
	if _, err := a.ListHostHistory(); err == nil || !strings.Contains(err.Error(), "数据库未初始化") {
		t.Fatalf("ListHostHistory err = %v, want database init error", err)
	}
	if _, err := a.AddHostHistory("1.1.1.1"); err == nil || !strings.Contains(err.Error(), "数据库未初始化") {
		t.Fatalf("AddHostHistory err = %v, want database init error", err)
	}
}

func TestAddHostHistoryValidatesInput(t *testing.T) {
	a := newHostHistoryTestApp(t)

	if _, err := a.AddHostHistory("   "); err == nil || !strings.Contains(err.Error(), "请输入 IPv4 地址") {
		t.Fatalf("empty err = %v, want IPv4 error", err)
	}
	if _, err := a.AddHostHistory("example.com"); err == nil || !strings.Contains(err.Error(), "请输入合法的 IPv4 地址") {
		t.Fatalf("domain err = %v, want valid IPv4 error", err)
	}
	if _, err := a.AddHostHistory("::1"); err == nil || !strings.Contains(err.Error(), "请输入合法的 IPv4 地址") {
		t.Fatalf("ipv6 err = %v, want valid IPv4 error", err)
	}
}

func TestHostHistoryAppMethodsReturnLatestList(t *testing.T) {
	a := newHostHistoryTestApp(t)

	items, err := a.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("initial items = %#v, want empty", items)
	}

	items, err = a.AddHostHistory(" 1.1.1.1 ")
	if err != nil {
		t.Fatalf("AddHostHistory first failed: %v", err)
	}
	if len(items) != 1 || items[0].Host != "1.1.1.1" || items[0].ID == "" || items[0].Ts == 0 {
		t.Fatalf("items after first add = %#v", items)
	}

	items, err = a.AddHostHistory("2.2.2.2")
	if err != nil {
		t.Fatalf("AddHostHistory second failed: %v", err)
	}
	if len(items) != 2 || items[0].Host != "2.2.2.2" {
		t.Fatalf("items after second add = %#v, want second at front", items)
	}

	items, err = a.RemoveHostHistory(items[1].ID)
	if err != nil {
		t.Fatalf("RemoveHostHistory failed: %v", err)
	}
	if len(items) != 1 || items[0].Host != "2.2.2.2" {
		t.Fatalf("items after remove = %#v, want only 2.2.2.2", items)
	}

	items, err = a.ClearHostHistory()
	if err != nil {
		t.Fatalf("ClearHostHistory failed: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("items after clear = %#v, want empty", items)
	}
}
