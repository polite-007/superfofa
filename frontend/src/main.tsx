import React from 'react'
import {createRoot} from 'react-dom/client'
import {TooltipProvider} from "@/components/ui/tooltip";
import {Toaster} from "@/components/ui/sonner";
import './style.css'
import App from './App'

const container = document.getElementById('root')

const root = createRoot(container!)

// 桌面应用禁用 Webview 默认右键菜单
window.addEventListener("contextmenu", (e) => e.preventDefault())

root.render(
    <React.StrictMode>
        <TooltipProvider delayDuration={300}>
            <App/>
            <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
    </React.StrictMode>
)
