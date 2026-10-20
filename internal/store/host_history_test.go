package store

import (
	"fmt"
	"path/filepath"
	"testing"

	"myproject/internal/model"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	t.Cleanup(func() {
		if err := s.Close(); err != nil {
			t.Fatalf("Close failed: %v", err)
		}
	})
	return s
}

func TestHostHistoryInitiallyEmpty(t *testing.T) {
	s := openTestStore(t)

	items, err := s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("items = %#v, want empty", items)
	}
}

func TestAddHostHistoryListsNewestFirst(t *testing.T) {
	s := openTestStore(t)

	if err := s.AddHostHistory(model.HostHistoryItem{ID: "old", Host: "1.1.1.1", Ts: 100}, 20); err != nil {
		t.Fatalf("AddHostHistory old failed: %v", err)
	}
	if err := s.AddHostHistory(model.HostHistoryItem{ID: "new", Host: "2.2.2.2", Ts: 200}, 20); err != nil {
		t.Fatalf("AddHostHistory new failed: %v", err)
	}

	items, err := s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("len(items) = %d, want 2: %#v", len(items), items)
	}
	if items[0].Host != "2.2.2.2" || items[1].Host != "1.1.1.1" {
		t.Fatalf("items order = %#v, want newest first", items)
	}
}

func TestAddHostHistoryDedupesByHostAndRefreshesTimestamp(t *testing.T) {
	s := openTestStore(t)

	if err := s.AddHostHistory(model.HostHistoryItem{ID: "first", Host: "1.1.1.1", Ts: 100}, 20); err != nil {
		t.Fatalf("AddHostHistory first failed: %v", err)
	}
	if err := s.AddHostHistory(model.HostHistoryItem{ID: "other", Host: "2.2.2.2", Ts: 150}, 20); err != nil {
		t.Fatalf("AddHostHistory other failed: %v", err)
	}
	if err := s.AddHostHistory(model.HostHistoryItem{ID: "second", Host: "1.1.1.1", Ts: 200}, 20); err != nil {
		t.Fatalf("AddHostHistory second failed: %v", err)
	}

	items, err := s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("len(items) = %d, want 2: %#v", len(items), items)
	}
	if items[0].ID != "second" || items[0].Host != "1.1.1.1" || items[0].Ts != 200 {
		t.Fatalf("refreshed item = %#v, want updated id/ts at front", items[0])
	}
}

func TestAddHostHistoryTrimsToLimit(t *testing.T) {
	s := openTestStore(t)

	for i := int64(1); i <= 25; i++ {
		item := model.HostHistoryItem{
			ID:   fmt.Sprintf("id-%02d", i),
			Host: fmt.Sprintf("10.0.0.%d", i),
			Ts:   i,
		}
		if err := s.AddHostHistory(item, 20); err != nil {
			t.Fatalf("AddHostHistory(%d) failed: %v", i, err)
		}
	}

	items, err := s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 20 {
		t.Fatalf("len(items) = %d, want 20", len(items))
	}
	if items[0].Ts != 25 || items[len(items)-1].Ts != 6 {
		t.Fatalf("kept range = newest %d oldest %d, want 25..6", items[0].Ts, items[len(items)-1].Ts)
	}
}

func TestRemoveAndClearHostHistory(t *testing.T) {
	s := openTestStore(t)

	if err := s.AddHostHistory(model.HostHistoryItem{ID: "one", Host: "1.1.1.1", Ts: 100}, 20); err != nil {
		t.Fatalf("AddHostHistory one failed: %v", err)
	}
	if err := s.AddHostHistory(model.HostHistoryItem{ID: "two", Host: "2.2.2.2", Ts: 200}, 20); err != nil {
		t.Fatalf("AddHostHistory two failed: %v", err)
	}
	if err := s.RemoveHostHistory("one"); err != nil {
		t.Fatalf("RemoveHostHistory failed: %v", err)
	}

	items, err := s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory failed: %v", err)
	}
	if len(items) != 1 || items[0].ID != "two" {
		t.Fatalf("items after remove = %#v, want only two", items)
	}

	if err := s.ClearHostHistory(); err != nil {
		t.Fatalf("ClearHostHistory failed: %v", err)
	}
	items, err = s.ListHostHistory()
	if err != nil {
		t.Fatalf("ListHostHistory after clear failed: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("items after clear = %#v, want empty", items)
	}
}
