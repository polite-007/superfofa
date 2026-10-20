package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

// GetAppVersion 返回构建注入的应用版本。
func (a *App) GetAppVersion() string {
	return normalizeVer(Version)
}

// CheckUpdate 对比当前版本与公开仓库最新 release 版本。
func (a *App) CheckUpdate() (UpdateInfo, error) {
	return a.checkUpdate(false)
}

func (a *App) checkUpdate(auto bool) (UpdateInfo, error) {
	current := normalizeVer(Version)
	info := UpdateInfo{CurrentVersion: current}

	api := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", updateRepoOwner, updateRepoName)
	req, err := http.NewRequest(http.MethodGet, api, nil)
	if err != nil {
		return info, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := a.updateHTTPClient().Do(req)
	if err != nil {
		return info, fmt.Errorf("检查更新失败（网络）：%v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return info, fmt.Errorf("GitHub API 返回状态 %d", resp.StatusCode)
	}

	var rel struct {
		TagName string         `json:"tag_name"`
		HTMLURL string         `json:"html_url"`
		Body    string         `json:"body"`
		Assets  []releaseAsset `json:"assets"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return info, err
	}

	latest := normalizeVer(rel.TagName)
	info.LatestVersion = latest
	info.ReleaseURL = rel.HTMLURL
	info.ReleaseNotes = strings.TrimSpace(rel.Body)

	cmp, ok := compareStableVer(latest, current)
	if !ok || cmp <= 0 {
		return info, nil
	}
	info.HasUpdate = true

	assetName := currentAssetName()
	info.AssetName = assetName
	if asset := pickAsset(rel.Assets, assetName); asset != nil {
		info.DownloadURL = asset.BrowserDownloadURL
	} else {
		info.ManualOnlyReason = manualReasonNoAsset
	}

	var checksumsURL string
	if asset := pickAsset(rel.Assets, checksumAssetName); asset != nil {
		checksumsURL = asset.BrowserDownloadURL
	}
	a.applyAutoInstallPrecheck(&info, checksumsURL)
	return info, nil
}

func normalizeVer(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "v")
	v = strings.TrimPrefix(v, "V")
	return strings.TrimSpace(v)
}

var stableVerRE = regexp.MustCompile(`^v?\d+(?:\.\d+){1,2}$`)

func parseStableVer(v string) ([]int, bool) {
	v = strings.TrimSpace(v)
	if !stableVerRE.MatchString(v) {
		return nil, false
	}
	v = normalizeVer(v)
	parts := strings.Split(v, ".")
	out := make([]int, 3)
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			return nil, false
		}
		out[i] = n
	}
	return out, true
}

// compareStableVer 比较稳定数字版本。返回 false 表示版本格式不支持自动更新。
func compareStableVer(a, b string) (int, bool) {
	pa, ok := parseStableVer(a)
	if !ok {
		return 0, false
	}
	pb, ok := parseStableVer(b)
	if !ok {
		return 0, false
	}
	for i := 0; i < 3; i++ {
		if pa[i] != pb[i] {
			return pa[i] - pb[i], true
		}
	}
	return 0, true
}
