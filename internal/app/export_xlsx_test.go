package app

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/xuri/excelize/v2"

	"myproject/internal/model"
)

func TestWriteExportXlsxCreatesFile(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportOutputDir = tmp

	task := model.ExportTask{
		Name:      "demo export",
		CreatedAt: "2026-07-02T03:04:05Z",
		Fields: []model.ExportField{
			{Key: "host", Label: "Host", FofaField: "host"},
			{Key: "ip", Label: "IP", FofaField: "ip"},
		},
	}
	rows := []map[string]string{
		{"host": "example.com", "ip": "1.1.1.1"},
	}

	outputPath, err := a.writeExportXLSX(task, rows)
	if err != nil {
		t.Fatalf("writeExportXLSX failed: %v", err)
	}

	expectedPath := filepath.Join(tmp, "demo export-20260702-110405.xlsx")
	if outputPath != expectedPath {
		t.Fatalf("unexpected output path: %s", outputPath)
	}
	info, err := os.Stat(outputPath)
	if err != nil {
		t.Fatalf("expected xlsx file to exist: %v", err)
	}
	if info.IsDir() {
		t.Fatal("expected xlsx output to be a file")
	}
	if info.Size() == 0 {
		t.Fatal("expected xlsx output file to be non-empty")
	}
}

func TestWriteExportXlsxUsesFieldSpecificTitlesForCompositeColumns(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportOutputDir = tmp

	task := model.ExportTask{
		Name:      "composite export",
		CreatedAt: "2026-07-02T03:04:05Z",
		Fields: []model.ExportField{
			{Key: "os_server:os", Label: "系统/服务", FofaField: "os"},
			{Key: "os_server:server", Label: "系统/服务", FofaField: "server"},
			{Key: "asn_org:asn", Label: "ASN/组织", FofaField: "asn"},
			{Key: "asn_org:org", Label: "ASN/组织", FofaField: "org"},
			{Key: "location:country_name", Label: "位置", FofaField: "country_name"},
			{Key: "location:region", Label: "位置", FofaField: "region"},
			{Key: "location:city", Label: "位置", FofaField: "city"},
		},
	}
	rows := []map[string]string{{
		"os":           "Linux",
		"server":       "nginx",
		"asn":          "AS123",
		"org":          "Example Org",
		"country_name": "中国",
		"region":       "浙江",
		"city":         "杭州",
	}}

	outputPath, err := a.writeExportXLSX(task, rows)
	if err != nil {
		t.Fatalf("writeExportXLSX failed: %v", err)
	}

	book, err := excelize.OpenFile(outputPath)
	if err != nil {
		t.Fatalf("open xlsx failed: %v", err)
	}
	defer func() { _ = book.Close() }()

	got, err := book.GetRows(exportXLSXSheetName)
	if err != nil {
		t.Fatalf("read xlsx rows failed: %v", err)
	}
	want := []string{"系统", "服务", "ASN", "组织", "国家", "地区", "城市"}
	if len(got) == 0 {
		t.Fatal("expected header row")
	}
	for idx, title := range want {
		if idx >= len(got[0]) || got[0][idx] != title {
			t.Fatalf("unexpected header row: got %v, want prefix %v", got[0], want)
		}
	}
}

func TestWriteExportXlsxCreatesUniqueFileWhenNameExists(t *testing.T) {
	tmp := t.TempDir()
	a := NewApp()
	a.exportOutputDir = tmp

	existingPath := filepath.Join(tmp, "query-export-20260702-110405.xlsx")
	if err := os.WriteFile(existingPath, []byte("opened elsewhere"), 0o600); err != nil {
		t.Fatal(err)
	}

	task := model.ExportTask{
		ID:        "task-1",
		Name:      "query-export",
		CreatedAt: "2026-07-02T03:04:05Z",
		Fields: []model.ExportField{
			{Key: "host", Label: "Host", FofaField: "host"},
		},
	}
	rows := []map[string]string{{"host": "example.com"}}

	outputPath, err := a.writeExportXLSX(task, rows)
	if err != nil {
		t.Fatalf("writeExportXLSX failed: %v", err)
	}
	if outputPath == existingPath {
		t.Fatalf("expected unique output path, got existing path %s", outputPath)
	}
	expectedPath := filepath.Join(tmp, "query-export-20260702-110405-task-1.xlsx")
	if outputPath != expectedPath {
		t.Fatalf("unexpected unique output path: %s", outputPath)
	}
	if _, err := os.Stat(outputPath); err != nil {
		t.Fatalf("expected unique xlsx file to exist: %v", err)
	}
}
