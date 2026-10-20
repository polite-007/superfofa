package app

import (
	"testing"
	"time"

	"myproject/internal/model"
)

func TestBuildExportQueryForDomain(t *testing.T) {
	got := buildExportQueryAt("domain", "example.com", model.ExportTimeRange{Preset: "custom"}, time.Date(2026, time.July, 2, 12, 0, 0, 0, time.UTC))
	want := "domain=\"example.com\""
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildExportQueryAppendsTimeRange(t *testing.T) {
	got := buildExportQuery("syntax", "domain=\"example.com\"", model.ExportTimeRange{
		Start: "2024-01-01",
		End:   "2024-01-31",
	})
	want := "domain=\"example.com\" && after=\"2024-01-01\" && before=\"2024-01-31\""
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildExportQueryAppliesMonthPreset(t *testing.T) {
	now := time.Date(2026, time.July, 2, 12, 0, 0, 0, time.UTC)
	got := buildExportQueryAt("syntax", "domain=\"example.com\"", model.ExportTimeRange{Preset: "month-3"}, now)
	want := "domain=\"example.com\" && after=\"2026-04-02\" && before=\"2026-07-02\""
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildExportQueryDefaultTimeRangeDoesNotAppendSyntax(t *testing.T) {
	now := time.Date(2026, time.July, 2, 12, 0, 0, 0, time.UTC)
	got := buildExportQueryAt("domain", "example.com", model.ExportTimeRange{}, now)
	want := "domain=\"example.com\""
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
