package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"myproject/internal/app"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	application := app.NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "super-fofa",
		Width:  1124,
		Height: 768,
		// 无边框窗口：标题栏由前端用 shadcn 组件自绘
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// 对齐 shadcn 深色主题 background (oklch 0.145 ≈ #1c1c1c)，避免加载时白闪
		BackgroundColour: &options.RGBA{R: 28, G: 28, B: 28, A: 1},
		OnStartup:        application.Startup,
		OnShutdown:       application.Shutdown,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
