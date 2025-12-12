# NAS 路径打开方案说明

由于浏览器安全限制，无法直接通过 `file://` 协议打开 UNC 网络路径。本文档提供了多种解决方案。

## 当前实现方案

### 方案1: PowerShell 脚本（已实现）✅

**优点：**
- 无需额外配置
- 不需要打包桌面应用
- 适用于所有 Windows 用户

**工作原理：**
1. 点击文件夹图标后，自动复制路径到剪贴板
2. 同时下载一个 PowerShell 脚本文件（`open-nas-path.ps1`）
3. 用户双击脚本文件即可自动打开文件管理器

**使用方法：**
1. 点击资产卡片上的文件夹图标
2. 在下载文件夹找到 `open-nas-path.ps1`
3. 右键点击 → "使用 PowerShell 运行"
4. 脚本会自动打开文件管理器并导航到 NAS 路径

**API 端点：**
- `GET /api/nas/open?path=<encoded_path>` - 生成并下载 PowerShell 脚本

---

## 其他可选方案

### 方案2: Electron 打包（推荐用于桌面应用）

将 Next.js 应用打包成桌面应用，可以绕过浏览器安全限制，直接调用系统 API 打开路径。

#### 安装 Electron

```bash
npm install --save-dev electron electron-builder
npm install --save electron-is-dev
```

#### 创建 Electron 主进程文件

创建 `electron/main.js`:

```javascript
const { app, BrowserWindow, shell } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理打开 NAS 路径的 IPC 消息
const { ipcMain } = require('electron');

ipcMain.handle('open-nas-path', async (event, nasPath) => {
  return new Promise((resolve, reject) => {
    // Windows: 使用 explorer.exe
    if (process.platform === 'win32') {
      exec(`explorer.exe "${nasPath}"`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({ success: true });
        }
      });
    } else {
      reject(new Error('Unsupported platform'));
    }
  });
});
```

#### 创建 Preload 脚本

创建 `electron/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openNasPath: (path) => ipcRenderer.invoke('open-nas-path', path),
});
```

#### 修改前端代码

在 `components/asset-card-gallery.tsx` 中：

```typescript
const handleCopyNasClick = useCallback(
  async (event: React.MouseEvent<HTMLButtonElement>) => {
    // ... 现有代码 ...
    
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        await (window as any).electronAPI.openNasPath(nasPathTrimmed);
        alert(`正在打开路径：\n${nasPathTrimmed}`);
        return;
      } catch (err) {
        console.error('Electron 打开失败:', err);
        // 降级到其他方案
      }
    }
    
    // ... 其他方案 ...
  },
  [asset.guangzhouNas, asset.shenzhenNas, officeLocation]
);
```

#### 配置 package.json

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "next build && next export",
    "electron:package": "electron-builder"
  },
  "build": {
    "appId": "com.hengxing.ue-asset-library",
    "productName": "恒星UE资产库",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "out/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    }
  }
}
```

#### 打包命令

```bash
# 开发模式
npm run electron:dev

# 打包
npm run electron:build
npm run electron:package
```

---

### 方案3: Tauri 打包（更轻量级）

Tauri 使用 Rust 和系统 WebView，体积更小，性能更好。

#### 安装 Tauri

```bash
npm install --save-dev @tauri-apps/cli
```

#### 初始化 Tauri

```bash
npx tauri init
```

#### 配置 Tauri

在 `src-tauri/tauri.conf.json` 中配置：

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../out"
  }
}
```

#### 添加 Rust 命令

在 `src-tauri/src/main.rs` 中添加：

```rust
#[tauri::command]
fn open_nas_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer.exe")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported platform".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_nas_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 前端调用

```typescript
import { invoke } from '@tauri-apps/api/tauri';

const handleCopyNasClick = async () => {
  try {
    await invoke('open_nas_path', { path: nasPathTrimmed });
    alert(`正在打开路径：\n${nasPathTrimmed}`);
  } catch (err) {
    console.error('打开失败:', err);
    // 降级到其他方案
  }
};
```

---

### 方案4: 自定义协议处理器

注册一个自定义协议（如 `nas://`），通过本地程序处理。

#### 创建协议处理器程序

创建一个简单的 Node.js 程序或 C# 程序来注册协议处理器。

#### Windows 注册表配置

```registry
[HKEY_CLASSES_ROOT\nas]
@="URL:NAS Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\nas\shell]

[HKEY_CLASSES_ROOT\nas\shell\open]

[HKEY_CLASSES_ROOT\nas\shell\open\command]
@="\"C:\\Path\\To\\nas-handler.exe\" \"%1\""
```

#### 前端调用

```typescript
window.location.href = `nas://${encodeURIComponent(nasPathTrimmed)}`;
```

**缺点：** 需要用户安装协议处理器程序，体验不够流畅。

---

## 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| PowerShell 脚本 | 简单，无需打包 | 需要用户手动运行脚本 | ⭐⭐⭐⭐ |
| Electron | 功能完整，跨平台 | 体积大（~100MB+） | ⭐⭐⭐ |
| Tauri | 体积小，性能好 | 需要 Rust 环境 | ⭐⭐⭐⭐ |
| 自定义协议 | 体验流畅 | 需要安装程序 | ⭐⭐ |

## 推荐方案

1. **当前使用**：PowerShell 脚本方案（已实现）
2. **如需桌面应用**：推荐使用 Tauri（体积小，性能好）
3. **如需完整功能**：使用 Electron（生态成熟）

---

## 使用建议

- 如果只是偶尔需要打开 NAS 路径，当前 PowerShell 脚本方案已经足够
- 如果需要频繁使用，建议打包成桌面应用（Tauri 或 Electron）
- 可以根据团队需求选择合适的方案
