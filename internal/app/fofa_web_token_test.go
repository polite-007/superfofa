package app

import (
	"path/filepath"
	"testing"

	"myproject/internal/model"
	"myproject/internal/store"
)

func newTokenTestApp(t *testing.T) *App {
	t.Helper()
	s, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	a := NewApp()
	a.store = s
	return a
}

func TestSetFofaWebTokenPersistsToken(t *testing.T) {
	a := newTokenTestApp(t)
	cfg, err := a.SetFofaWebToken(" header.payload.signature ")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.FofaWebToken != "header.payload.signature" {
		t.Fatalf("token = %q", cfg.FofaWebToken)
	}
}

func TestSetFofaWebTokenClearsWhitespaceToken(t *testing.T) {
	a := newTokenTestApp(t)
	if _, err := a.SetFofaWebToken("saved.header.signature"); err != nil {
		t.Fatal(err)
	}

	cfg, err := a.SetFofaWebToken("   ")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.FofaWebToken != "" {
		t.Fatalf("returned token = %q, want empty", cfg.FofaWebToken)
	}

	stored, err := a.GetKeyConfig()
	if err != nil {
		t.Fatal(err)
	}
	if stored.FofaWebToken != "" {
		t.Fatalf("stored token = %q, want empty", stored.FofaWebToken)
	}
}

func TestSetKeyConfigDoesNotOverwriteFofaWebToken(t *testing.T) {
	a := newTokenTestApp(t)
	if _, err := a.SetFofaWebToken("saved.header.signature"); err != nil {
		t.Fatal(err)
	}

	cfg, err := a.SetKeyConfig(model.KeyConfig{
		Mode:         model.KeyModeSequence,
		BaseURL:      "https://fofa.info",
		Proxy:        "http://127.0.0.1:7890",
		FofaWebToken: "stale.nonempty.signature",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.FofaWebToken != "saved.header.signature" {
		t.Fatalf("returned token = %q", cfg.FofaWebToken)
	}

	stored, err := a.GetKeyConfig()
	if err != nil {
		t.Fatal(err)
	}
	if stored.FofaWebToken != "saved.header.signature" {
		t.Fatalf("stored token = %q", stored.FofaWebToken)
	}
}

func TestSetKeyConfigDoesNotResurrectClearedFofaWebToken(t *testing.T) {
	a := newTokenTestApp(t)
	if _, err := a.SetFofaWebToken("old.header.signature"); err != nil {
		t.Fatal(err)
	}
	if _, err := a.SetFofaWebToken(""); err != nil {
		t.Fatal(err)
	}

	cfg, err := a.SetKeyConfig(model.KeyConfig{
		Mode:         model.KeyModeSequence,
		BaseURL:      "https://fofa.info",
		Proxy:        "http://127.0.0.1:7890",
		FofaWebToken: "old.header.signature",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.FofaWebToken != "" {
		t.Fatalf("returned token = %q, want empty", cfg.FofaWebToken)
	}

	stored, err := a.GetKeyConfig()
	if err != nil {
		t.Fatal(err)
	}
	if stored.FofaWebToken != "" {
		t.Fatalf("stored token = %q, want empty", stored.FofaWebToken)
	}
}
