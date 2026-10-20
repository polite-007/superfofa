package app

import (
	"strings"
	"testing"

	"github.com/polite-007/toolbox/fofa"

	"myproject/internal/model"
)

func TestIsIPv4(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"1.1.1.1", true},
		{"255.255.255.255", true},
		{"0.0.0.0", true},
		{"78.48.50.249", true},
		{"256.1.1.1", false},
		{"1.1.1", false},
		{"example.com", false},
		{"::1", false},
		{"2001:db8::1", false},
		{"", false},
		{" 1.1.1.1 ", false}, // 未 trim，调用方负责 trim
	}
	for _, c := range cases {
		if got := isIPv4(c.in); got != c.want {
			t.Errorf("isIPv4(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestNormalizeHostPortsNilSafe(t *testing.T) {
	if got := normalizeHostPorts(nil); len(got) != 0 {
		t.Errorf("normalizeHostPorts(nil) = %#v, want empty", got)
	}
	ports := normalizeHostPorts([]fofa.HostPort{
		{Port: 443, Protocol: "https", Products: nil},
	})
	if len(ports) != 1 || ports[0].Port != 443 {
		t.Fatalf("unexpected ports: %#v", ports)
	}
	if ports[0].Products == nil {
		t.Errorf("Products should be non-nil empty slice, got nil")
	}
}

func TestNormalizeHostPortsMapsSortHardCode(t *testing.T) {
	ports := normalizeHostPorts([]fofa.HostPort{
		{
			Port:     443,
			Protocol: "https",
			Products: []fofa.HostProduct{
				{Product: "Synology-WebStation", Category: "CMS", Level: 5, SortHardCode: 2},
			},
		},
	})
	if len(ports) != 1 || len(ports[0].Products) != 1 {
		t.Fatalf("unexpected ports: %#v", ports)
	}
	pr := ports[0].Products[0]
	if pr.Product != "Synology-WebStation" || pr.Level != 5 || pr.SortHardCode != 2 {
		t.Errorf("mapped product = %#v, want SortHardCode=2 Level=5", pr)
	}
}

func TestEnsureSlicesNilSafe(t *testing.T) {
	if got := ensureStringSlice(nil); len(got) != 0 {
		t.Errorf("ensureStringSlice(nil) = %#v", got)
	}
	if got := ensureIntSlice(nil); len(got) != 0 {
		t.Errorf("ensureIntSlice(nil) = %#v", got)
	}
}

func TestQueryHostValidatesIPv4BeforeStore(t *testing.T) {
	a := NewApp()
	// 输入校验在 store 检查之前：空 host / 非法 host 直接报输入错误
	if _, err := a.QueryHost(model.HostReq{Host: ""}); err == nil || !strings.Contains(err.Error(), "IPv4") {
		t.Fatalf("empty host err = %v", err)
	}
	if _, err := a.QueryHost(model.HostReq{Host: "example.com"}); err == nil || !strings.Contains(err.Error(), "IPv4") {
		t.Fatalf("domain err = %v", err)
	}
	if _, err := a.QueryHost(model.HostReq{Host: "::1"}); err == nil || !strings.Contains(err.Error(), "IPv4") {
		t.Fatalf("ipv6 err = %v", err)
	}
	// 合法 IPv4 通过校验后应报 store 未初始化
	if _, err := a.QueryHost(model.HostReq{Host: "1.1.1.1"}); err == nil || !strings.Contains(err.Error(), "数据库未初始化") {
		t.Fatalf("valid ip err = %v", err)
	}
}
