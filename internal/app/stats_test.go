package app

import (
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

type errString string

func (e errString) Error() string { return string(e) }

func TestNormalizeStatsFields(t *testing.T) {
	t.Run("preserves order and removes duplicates", func(t *testing.T) {
		got, err := normalizeStatsFields(" title,domain,title, protocol ,domain ")
		if err != nil {
			t.Fatalf("normalizeStatsFields returned error: %v", err)
		}
		want := []string{"title", "domain", "protocol"}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("fields mismatch: got %#v want %#v", got, want)
		}
	})

	t.Run("unsupported fields", func(t *testing.T) {
		_, err := normalizeStatsFields("title,ip,country_name")
		want := "不支持的统计字段：ip, country_name。支持字段：protocol, domain, port, title, os, server, country, asn, org, asset_type, fid, icp"
		if err == nil || err.Error() != want {
			t.Fatalf("error mismatch: got %v want %q", err, want)
		}
	})

	t.Run("empty fields", func(t *testing.T) {
		_, err := normalizeStatsFields(" , , ")
		want := "请选择统计字段"
		if err == nil || err.Error() != want {
			t.Fatalf("error mismatch: got %v want %q", err, want)
		}
	})

	t.Run("more than five fields", func(t *testing.T) {
		_, err := normalizeStatsFields("protocol,domain,port,title,os,server")
		want := "最多选择 5 个统计字段"
		if err == nil || err.Error() != want {
			t.Fatalf("error mismatch: got %v want %q", err, want)
		}
	})
}

func TestValidateStatsSize(t *testing.T) {
	for _, size := range []int{10, 50, 100, 500} {
		got, err := validateStatsSize(size)
		if err != nil {
			t.Fatalf("validateStatsSize(%d) returned error: %v", size, err)
		}
		if got != size {
			t.Fatalf("validateStatsSize(%d) = %d", size, got)
		}
	}

	cases := []struct {
		size int
		want string
	}{
		{0, "请选择有效的 TopN"},
		{-1, "请选择有效的 TopN"},
		{501, "size 最大支持 500"},
		{20, "TopN 仅支持 10、50、100、500"},
	}
	for _, tc := range cases {
		_, err := validateStatsSize(tc.size)
		if err == nil || err.Error() != tc.want {
			t.Fatalf("validateStatsSize(%d) error mismatch: got %v want %q", tc.size, err, tc.want)
		}
	}
}

func TestConvertStatsResponse(t *testing.T) {
	resp := &fofa.StatsResponse{
		Distinct: map[string]int{"title": 8, "domain": 3},
		Field:    "protocol,title,domain",
		Size:     1234,
	}
	all := map[string][]*fofa.StatsResult{
		"protocol": {
			{Name: "https", Count: 7},
			{Name: "http", Count: 5},
		},
		"title": {
			{Name: "admin", Count: 2},
		},
	}
	fields := []string{"protocol", "title", "domain"}

	got := convertStatsResponse("title=admin", fields, 50, resp, all, "acc-1", "a@example.com", 123)

	want := model.StatsFofaResult{
		Query:    "title=admin",
		Fields:   []string{"protocol", "title", "domain"},
		Size:     50,
		Total:    1234,
		Returned: map[string]int{"protocol": 2, "title": 1, "domain": 0},
		Distinct: map[string]int64{"protocol": 0, "title": 8, "domain": 3},
		Aggs: map[string][]model.StatsAggItem{
			"protocol": {{Name: "https", Count: 7}, {Name: "http", Count: 5}},
			"title":    {{Name: "admin", Count: 2}},
			"domain":   {},
		},
		AccountID:    "acc-1",
		AccountEmail: "a@example.com",
		ElapsedMs:    123,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("converted result mismatch:\ngot:  %#v\nwant: %#v", got, want)
	}

	fields[0] = "mutated"
	if got.Fields[0] != "protocol" {
		t.Fatalf("expected fields to be copied, got %#v", got.Fields)
	}
}

func TestStatsThrottleWaitDuration(t *testing.T) {
	last := time.Date(2026, 7, 2, 12, 0, 0, 0, time.UTC)
	now := time.Date(2026, 7, 2, 12, 0, 3, 0, time.UTC)
	if got := statsThrottleWaitDuration(last, now); got != 2*time.Second {
		t.Fatalf("wait mismatch: got %s want 2s", got)
	}
	if got := statsThrottleWaitDuration(time.Time{}, now); got != 0 {
		t.Fatalf("zero last wait mismatch: got %s want 0", got)
	}
	if got := statsThrottleWaitDuration(last, last.Add(6*time.Second)); got != 0 {
		t.Fatalf("older wait mismatch: got %s want 0", got)
	}
}

func TestTranslateStatsError(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want string
	}{
		{"fofa api", errString("FOFA API 错误: invalid query"), "invalid query"},
		{"too fast", errString("server says 请求过快 try later"), "请求过快，请稍后重试"},
		{"network", errString("dial tcp timeout"), "统计聚合失败，请检查网络/代理后重试：dial tcp timeout"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := translateStatsError(tc.err)
			if got == nil || got.Error() != tc.want {
				t.Fatalf("error mismatch: got %v want %q", got, tc.want)
			}
		})
	}

	if got := translateStatsError(nil); !errors.Is(got, nil) {
		t.Fatalf("nil error mismatch: got %v", got)
	}
}
