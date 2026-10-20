package app

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"time"

	"myproject/internal/logger"
	"myproject/internal/model"
	"myproject/internal/store"
)

type exportSearchPageResult struct {
	Rows []map[string]string
}

// App 应用主体，Wails 绑定其方法供前端调用
type App struct {
	ctx               context.Context
	store             *store.Store
	pickMu            sync.Mutex // 保护 PickAccount(sequence) 的 read-modify-write
	statsMu           sync.Mutex
	lastStatsAt       time.Time
	exportRunMu       sync.Mutex
	runningExportTask map[string]context.CancelFunc
	exportSearchPage  func(task model.ExportTask, item model.ExportTaskItem, page int) (exportSearchPageResult, error)
	dbPath            string
	exportDataDir     string
	exportTaskDir     string
	exportCacheDir    string
	exportOutputDir   string
	updateMu          sync.Mutex
	updateState       UpdateState
	updateCancel      context.CancelFunc
	updateAutoChecked bool
	updateDataDir     string
}

// NewApp 创建应用实例
func NewApp() *App {
	return &App{runningExportTask: map[string]context.CancelFunc{}}
}

// Startup 启动时打开数据库
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	dir := userDataDir()
	appLog := logger.For("app")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		appLog.Error("创建数据目录失败", "error", err)
		return
	}
	if err := logger.Init(filepath.Join(dir, "logs")); err != nil {
		appLog.Error("初始化日志失败", "error", err)
	}
	appLog = logger.For("app")

	a.exportDataDir = filepath.Join(dir, "exports")
	a.exportTaskDir = filepath.Join(a.exportDataDir, "tasks")
	a.exportCacheDir = filepath.Join(a.exportDataDir, "checkpoints")
	a.exportOutputDir = filepath.Join(a.exportDataDir, "output")
	a.updateDataDir = updateDataDir()
	for _, path := range []string{a.exportTaskDir, a.exportCacheDir, a.exportOutputDir, a.updateDataDir, updateDownloadsDir(), updateStagedDir()} {
		if err := os.MkdirAll(path, 0o700); err != nil {
			appLog.Error("创建导出目录失败", "path", path, "error", err)
			return
		}
	}

	a.dbPath = filepath.Join(dir, "super-fofa.db")
	s, err := store.Open(a.dbPath)
	if err != nil {
		appLog.Error("打开数据库失败", "db_path", a.dbPath, "error", err)
		return
	}
	a.store = s
	a.cleanupSuccessfulUpdateState()
	a.setUpdateState(UpdateState{Phase: UpdatePhaseIdle}, false)
	go a.autoCheckUpdate()
}

// Shutdown 关闭数据库
func (a *App) Shutdown(ctx context.Context) {
	if a.store != nil {
		_ = a.store.Close()
	}
}
