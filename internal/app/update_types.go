package app

import "time"

// Version is injected by release builds via -ldflags. Dev builds keep "dev".
var Version = "dev"

const updateStateEvent = "update:state"

type UpdatePhase string

const (
	UpdatePhaseIdle        UpdatePhase = "idle"
	UpdatePhaseChecking    UpdatePhase = "checking"
	UpdatePhaseAvailable   UpdatePhase = "available"
	UpdatePhaseDownloading UpdatePhase = "downloading"
	UpdatePhaseVerifying   UpdatePhase = "verifying"
	UpdatePhaseExtracting  UpdatePhase = "extracting"
	UpdatePhaseReady       UpdatePhase = "ready"
	UpdatePhaseInstalling  UpdatePhase = "installing"
	UpdatePhaseError       UpdatePhase = "error"
)

// UpdateInfo 检查更新返回结果
type UpdateInfo struct {
	CurrentVersion       string `json:"current_version"`
	LatestVersion        string `json:"latest_version"`
	HasUpdate            bool   `json:"has_update"`
	ReleaseURL           string `json:"release_url"`
	DownloadURL          string `json:"download_url"`
	AssetName            string `json:"asset_name"`
	ChecksumURL          string `json:"checksum_url"`
	ExpectedSHA256       string `json:"expected_sha256"`
	ReleaseNotes         string `json:"release_notes"`
	AutoInstallAvailable bool   `json:"auto_install_available"`
	ManualOnlyReason     string `json:"manual_only_reason"`
}

type ReadyUpdate struct {
	Version     string `json:"version"`
	AssetName   string `json:"asset_name"`
	PackagePath string `json:"package_path"`
	StagedPath  string `json:"staged_path"`
	TargetPath  string `json:"target_path"`
	UpdaterPath string `json:"updater_path"`
	LaunchPath  string `json:"launch_path"`
	BackupPath  string `json:"backup_path"`
}

type UpdateState struct {
	Phase            UpdatePhase  `json:"phase"`
	Percent          *float64     `json:"percent,omitempty"`
	Downloaded       int64        `json:"downloaded,omitempty"`
	Total            int64        `json:"total,omitempty"`
	Message          string       `json:"message,omitempty"`
	Info             *UpdateInfo  `json:"info,omitempty"`
	Ready            *ReadyUpdate `json:"ready,omitempty"`
	ManualOnlyReason string       `json:"manual_only_reason,omitempty"`
	AutoToast        bool         `json:"auto_toast,omitempty"`
}

type updateStatusFile struct {
	Status  string    `json:"status"`
	Version string    `json:"version,omitempty"`
	Stage   string    `json:"stage,omitempty"`
	Message string    `json:"message,omitempty"`
	Time    time.Time `json:"time"`
	Read    bool      `json:"read,omitempty"`
}
