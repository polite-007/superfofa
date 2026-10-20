package app

import (
	"fmt"
	"regexp"
	"strings"

	"myproject/internal/model"
)

var (
	ipv4Pattern   = regexp.MustCompile(`^(?:\d{1,3}\.){3}\d{1,3}$`)
	hostPattern   = regexp.MustCompile(`^[A-Za-z0-9.-]+:\d+$`)
	domainPattern = regexp.MustCompile(`^(?i)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$`)
)

func (a *App) precheckExport(req model.ExportPrecheckReq) (model.ExportPrecheckResult, error) {
	text := strings.ReplaceAll(req.Text, "\r\n", "\n")
	lines := strings.Split(text, "\n")
	result := model.ExportPrecheckResult{
		TaskName:   strings.TrimSpace(req.TaskName),
		Source:     req.Source,
		InputType:  req.InputType,
		TotalLines: len(lines),
	}
	seen := map[string]struct{}{}
	for _, raw := range lines {
		normalized, ok := normalizeExportItem(req.InputType, raw)
		if strings.TrimSpace(raw) == "" {
			continue
		}
		if !ok {
			result.InvalidItems++
			if len(result.InvalidExamples) < 5 {
				result.InvalidExamples = append(result.InvalidExamples, strings.TrimSpace(raw))
			}
			continue
		}
		if _, exists := seen[normalized]; exists {
			result.DuplicateItems++
			continue
		}
		seen[normalized] = struct{}{}
		result.NormalizedItems = append(result.NormalizedItems, normalized)
	}
	result.ValidItems = len(result.NormalizedItems)
	if result.ValidItems == 0 {
		return result, fmt.Errorf("没有可导出的有效%s输入", req.InputType)
	}
	if result.TaskName == "" {
		result.TaskName = defaultExportTaskName(req.Source, req.InputType, req.SourceFileName)
	}
	return result, nil
}

func normalizeExportItem(inputType string, raw string) (string, bool) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return "", false
	}
	switch inputType {
	case model.ExportInputSyntax:
		return v, true
	case model.ExportInputIP:
		return v, ipv4Pattern.MatchString(v)
	case model.ExportInputHost:
		return strings.ToLower(v), hostPattern.MatchString(v)
	case model.ExportInputDomain:
		v = strings.ToLower(v)
		return v, domainPattern.MatchString(v)
	default:
		return "", false
	}
}

func defaultExportTaskName(source, inputType, fileName string) string {
	prefix := map[string]string{
		model.ExportInputSyntax: "query-export",
		model.ExportInputIP:     "ip-export",
		model.ExportInputHost:   "host-export",
		model.ExportInputDomain: "domain-export",
	}[inputType]
	if prefix == "" {
		prefix = "export-task"
	}
	if source == model.ExportSourceFile && strings.TrimSpace(fileName) != "" {
		return fmt.Sprintf("%s_%s", fileName, prefix)
	}
	return prefix
}
