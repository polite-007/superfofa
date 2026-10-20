package app

import (
	"testing"

	"myproject/internal/model"
)

func TestExportModelDefaultsCompile(t *testing.T) {
	_ = model.ExportTask{}
	_ = model.ExportTaskItem{}
	_ = model.ExportPrecheckReq{}
	_ = model.ExportPrecheckResult{}
	_ = model.CreateExportTaskReq{}
}

func TestPrecheckTextDomainDedupesAndCollectsInvalids(t *testing.T) {
	a := NewApp()
	result, err := a.precheckExport(model.ExportPrecheckReq{
		Source:    model.ExportSourceText,
		InputType: model.ExportInputDomain,
		Text:      "Example.com\nexample.com\ninvalid domain\nfoo.bar\n",
	})
	if err != nil {
		t.Fatalf("precheck returned error: %v", err)
	}
	if result.ValidItems != 2 {
		t.Fatalf("expected 2 valid items, got %d", result.ValidItems)
	}
	if result.DuplicateItems != 1 {
		t.Fatalf("expected 1 duplicate item, got %d", result.DuplicateItems)
	}
	if result.InvalidItems != 1 {
		t.Fatalf("expected 1 invalid item, got %d", result.InvalidItems)
	}
	if len(result.NormalizedItems) != 2 || result.NormalizedItems[0] != "example.com" {
		t.Fatalf("unexpected normalized items: %#v", result.NormalizedItems)
	}
}

func TestPrecheckQuerySourceKeepsSingleSyntaxItem(t *testing.T) {
	a := NewApp()
	result, err := a.precheckExport(model.ExportPrecheckReq{
		Source:    model.ExportSourceQuery,
		InputType: model.ExportInputSyntax,
		Text:      `app="nginx"`,
	})
	if err != nil {
		t.Fatalf("precheck returned error: %v", err)
	}
	if result.ValidItems != 1 || len(result.NormalizedItems) != 1 {
		t.Fatalf("unexpected query precheck result: %#v", result)
	}
}
