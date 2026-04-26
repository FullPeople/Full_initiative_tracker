# Full Initiative Tracker — Owlbear Rodeo Extension

[English](#english) | [中文](#中文)

---

## English

A full-featured initiative tracker extension for [Owlbear Rodeo](https://www.owlbear.rodeo/), the free online virtual tabletop.

### Install

Paste the following URL into **Owlbear Rodeo → Settings → Extensions → Add Custom Extension**:

```
https://obr.dnd.center/initiative/manifest.json
```

### Features

- **Initiative List** — Always visible in the action panel, even outside of combat
- **Image-based Entries** — Token images displayed as full-width backgrounds with center crop
- **Editable by Everyone** — Any player can edit initiative values; the list auto-sorts in descending order
- **Camera Focus** — Click any entry to smoothly center the camera on that token
- **GM Controls** (GM only)
  - **Start Combat** — Triggers a full-screen combat animation synced to all players
  - **Previous / Next Turn** — Advance or go back in initiative order, with auto camera focus
  - **End Combat** — Clears active state and notifies all players
- **Round Counter** — Automatically tracks and displays the current round number
- **Hidden Token Support** — Hidden tokens are automatically skipped in turn order and hidden from the list; they return when made visible
- **Multi-select** — Box-select multiple tokens and add them all to initiative at once via right-click
- **New Token Detection** — During combat, newly added tokens prompt the GM for an initiative value
- **Language Switching** — Toggle between English and Chinese (中文) via dropdown in the header

### Screenshots

*(Coming soon)*

### Development

```bash
# Install dependencies
npm install

# Start dev server (HTTPS for OBR compatibility)
npm run dev

# Build for production
npm run build
```

For local development, install in OBR with `https://localhost:5173/manifest.json`.  
You may need to enable `chrome://flags/#allow-insecure-localhost` first.

### Tech Stack

- React 18 + TypeScript
- Vite
- [@owlbear-rodeo/sdk](https://docs.owlbear.rodeo/extensions/) v3.x

### License

[PolyForm Noncommercial License 1.0.0](./LICENSE) — see the LICENSE file for the full text.

**Quick summary** (informal, see LICENSE for legally-binding terms):

- ✅ Free to view, modify, fork, and redistribute for **noncommercial** purposes
- ✅ Must keep the `Required Notice: Copyright (c) 2026 FullPeople` line in any redistribution
- ❌ **Commercial use prohibited** — selling the code, paid hosting, for-profit products, paid integrations, etc. are NOT allowed
- ✅ Individual TRPG players, hobby projects, schools, research, charity use — all allowed
- ✅ Noncommercial derivatives may be closed-source and redistributed

---

## 中文

一个功能丰富的 [Owlbear Rodeo](https://www.owlbear.rodeo/)（枭熊虚拟桌面）先攻追踪器插件。

### 安装

将以下链接粘贴到 **Owlbear Rodeo → 设置 → 扩展 → 添加自定义扩展**：

```
https://obr.dnd.center/initiative/manifest.json
```

### 功能

- **先攻列表** — 始终显示在操作面板中，战斗外也可使用
- **图片背景** — 角色图片作为整个条目背景显示，居中裁剪
- **任何人可编辑** — 所有玩家都能修改先攻值，列表自动按降序排列
- **摄像头聚焦** — 点击任意条目自动平滑聚焦到对应角色
- **GM 控制**（仅主持人可见）
  - **开始战斗** — 触发全屏战斗开始动画，同步给所有玩家
  - **上一个 / 下一个** — 在先攻顺序中前进或后退，自动聚焦摄像头
  - **结束战斗** — 清除战斗状态并通知所有玩家
- **回合计数** — 自动追踪并显示当前回合数
- **隐藏角色支持** — 隐藏的角色自动跳过回合且不显示在列表中，显示后自动回归
- **多选支持** — 框选多个角色后右键一次性批量加入先攻
- **新角色检测** — 战斗中拖入新角色时，弹窗提示 GM 输入先攻值
- **语言切换** — 在顶栏下拉菜单中切换中文和英文

### 截图

*（即将添加）*

### 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（HTTPS，兼容 OBR）
npm run dev

# 构建生产版本
npm run build
```

本地开发时，在 OBR 中使用 `https://localhost:5173/manifest.json` 安装。
可能需要先启用 `chrome://flags/#allow-insecure-localhost`。

### 技术栈

- React 18 + TypeScript
- Vite
- [@owlbear-rodeo/sdk](https://docs.owlbear.rodeo/extensions/) v3.x

### 许可证

[PolyForm Noncommercial License 1.0.0](./LICENSE) —— 详见 LICENSE 文件。

**通俗说明**（仅供理解，以 LICENSE 全文为准）：

- ✅ **可以**：自由查看、修改、二次创作、非商用分发
- ✅ **必须**：保留 `Required Notice: Copyright (c) 2026 FullPeople` 这一行（标明出处）
- ❌ **不允许**：任何商业用途 —— 包括但不限于售卖代码 / 售卖部署服务 / 用于盈利产品 / 嵌入收费应用
- ✅ 个人玩家、TRPG 团队自用、爱好者改造、学校研究、公益用途 **均允许**
- ✅ 非商用衍生品 **可以闭源**、可以重新分发（只要不卖钱）

---

## 💖 支持作者

如果这些插件对你的跑团有帮助，欢迎来爱发电支持一下作者 —— 用于服务器续费和新插件开发 ♥

[![前往爱发电](https://img.shields.io/badge/%E7%88%B1%E5%8F%91%E7%94%B5-FullPeople-FF6B9D?style=for-the-badge&logo=heart&logoColor=white)](https://ifdian.net/a/fullpeople)

> 反馈或建议：[1763086701@qq.com](mailto:1763086701@qq.com)
