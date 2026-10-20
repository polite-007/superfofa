package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	toolboxxlsx "github.com/polite-007/toolbox/xlsx"

	"myproject/internal/model"
)

const exportXLSXSheetName = toolboxxlsx.DefaultAssetExportSheetName

func (a *App) writeExportXLSX(task model.ExportTask, rows []map[string]string) (string, error) {
	if strings.TrimSpace(a.exportOutputDir) == "" {
		return "", fmt.Errorf("export output dir is not configured")
	}

	outputPath := a.exportXLSXPath(task)
	titles := make([]string, 0, len(task.Fields))
	data := make([][]string, 0, len(rows))

	for _, field := range task.Fields {
		titles = append(titles, exportFieldTitle(field))
	}

	for _, row := range rows {
		line := make([]string, 0, len(task.Fields))
		for _, field := range task.Fields {
			line = append(line, row[field.FofaField])
		}
		data = append(data, line)
	}

	sheets := []*toolboxxlsx.SheetData{{
		SheetName: exportXLSXSheetName,
		Titles:    titles,
		Data:      data,
	}}
	if err := toolboxxlsx.GenerateExcelToFile(outputPath, sheets); err != nil {
		return "", fmt.Errorf("generate xlsx: %w", err)
	}
	return outputPath, nil
}

func (a *App) exportXLSXPath(task model.ExportTask) string {
	baseName := sanitizeExportFileName(task.Name)
	timestamp := exportTaskBeijingTimestamp(task.CreatedAt)
	if timestamp != "" {
		baseName += "-" + timestamp
	}
	basePath := filepath.Join(a.exportOutputDir, baseName+".xlsx")
	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		return basePath
	}

	if task.ID != "" {
		idPath := filepath.Join(a.exportOutputDir, baseName+"-"+sanitizeExportFileName(task.ID)+".xlsx")
		if _, err := os.Stat(idPath); os.IsNotExist(err) {
			return idPath
		}
	}

	for idx := 1; ; idx++ {
		candidate := filepath.Join(a.exportOutputDir, fmt.Sprintf("%s-%d.xlsx", baseName, idx))
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate
		}
	}
}

func exportTaskBeijingTimestamp(createdAt string) string {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(createdAt))
	if err != nil {
		return ""
	}
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		loc = time.FixedZone("Asia/Shanghai", 8*60*60)
	}
	return parsed.In(loc).Format("20060102-150405")
}

func exportFieldTitle(field model.ExportField) string {
	fofaField := strings.TrimSpace(field.FofaField)
	switch fofaField {
	case "os":
		return "系统"
	case "server":
		return "服务"
	case "asn":
		return "ASN"
	case "org":
		return "组织"
	case "country_name":
		return "国家"
	case "region":
		return "地区"
	case "city":
		return "城市"
	}

	title := strings.TrimSpace(field.Label)
	if title == "" {
		title = strings.TrimSpace(field.Key)
	}
	return title
}

func sanitizeExportFileName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "export"
	}
	replacer := strings.NewReplacer(
		"<", "_",
		">", "_",
		":", "_",
		"\"", "_",
		"/", "_",
		"\\", "_",
		"|", "_",
		"?", "_",
		"*", "_",
	)
	sanitized := strings.TrimSpace(replacer.Replace(trimmed))
	sanitized = strings.TrimRight(sanitized, ". ")
	if sanitized == "" {
		return "export"
	}
	return sanitized
}
