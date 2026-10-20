package app

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"myproject/internal/model"
)

func buildExportQuery(inputType, normalized string, tr model.ExportTimeRange) string {
	return buildExportQueryAt(inputType, normalized, tr, time.Now().UTC())
}

func buildExportQueryAt(inputType, normalized string, tr model.ExportTimeRange, now time.Time) string {
	query := strings.TrimSpace(normalized)
	switch strings.TrimSpace(inputType) {
	case "ip":
		query = fmt.Sprintf("ip=\"%s\"", query)
	case "host":
		query = fmt.Sprintf("host=\"%s\"", query)
	case "domain":
		query = fmt.Sprintf("domain=\"%s\"", query)
	case "syntax":
		// keep raw normalized query
	}

	start, end := exportTimeRangeBounds(tr, now)
	if start != "" {
		query += " && after=\"" + start + "\""
	}
	if end != "" {
		query += " && before=\"" + end + "\""
	}

	return query
}

func exportTimeRangeBounds(tr model.ExportTimeRange, now time.Time) (string, string) {
	start := strings.TrimSpace(tr.Start)
	end := strings.TrimSpace(tr.End)
	if start != "" || end != "" {
		return start, end
	}

	now = now.UTC()
	switch preset := strings.TrimSpace(tr.Preset); {
	case preset == "custom":
		return "", ""
	case strings.HasPrefix(preset, "month-"):
		months, err := strconv.Atoi(strings.TrimPrefix(preset, "month-"))
		if err != nil || months < 1 {
			months = 1
		}
		if months > 24 {
			months = 24
		}
		return now.AddDate(0, -months, 0).Format("2006-01-02"), now.Format("2006-01-02")
	default:
		return "", ""
	}
}
