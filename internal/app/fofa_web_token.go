package app

import (
	"fmt"
	"strings"

	"myproject/internal/model"
)

func (a *App) SetFofaWebToken(token string) (model.KeyConfig, error) {
	if a.store == nil {
		return model.KeyConfig{}, fmt.Errorf("数据库未初始化")
	}
	if err := a.store.SetConfigValue("fofa_web_token", strings.TrimSpace(token)); err != nil {
		return model.KeyConfig{}, err
	}
	return a.store.GetKeyConfig()
}
