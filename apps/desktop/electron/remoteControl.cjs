const { screen } = require('electron')
const { exec } = require('child_process')

// Windows mouse_event flags
const MOUSEEVENTF_LEFTDOWN = 0x0002
const MOUSEEVENTF_LEFTUP = 0x0004
const MOUSEEVENTF_RIGHTDOWN = 0x0008
const MOUSEEVENTF_RIGHTUP = 0x00010
const MOUSEEVENTF_MIDDLEDOWN = 0x0020
const MOUSEEVENTF_MIDDLEUP = 0x0040
const MOUSEEVENTF_WHEEL = 0x0800

class RemoteControlExecutor {
  constructor() {
    this.primaryDisplay = null
  }

  getDisplayBounds() {
    try {
      const primary = screen.getPrimaryDisplay()
      return primary.bounds
    } catch {
      return { width: 1920, height: 1080 }
    }
  }

  executeEvent(payload) {
    if (!payload || typeof payload !== 'object') return false
    if (process.platform !== 'win32') return false

    const bounds = this.getDisplayBounds()

    switch (payload.type) {
      case 'ctrl_mouse':
        return this.handleMouseEvent(payload, bounds)
      case 'ctrl_wheel':
        return this.handleWheelEvent(payload)
      case 'ctrl_key':
        return this.handleKeyEvent(payload)
      default:
        return false
    }
  }

  handleMouseEvent(payload, bounds) {
    const rawX = typeof payload.x === 'number' ? payload.x : 0.5
    const rawY = typeof payload.y === 'number' ? payload.y : 0.5

    const screenX = Math.round(rawX * bounds.width)
    const screenY = Math.round(rawY * bounds.height)

    const eventName = payload.event
    const button = payload.button || 0

    let flags = 0
    if (eventName === 'mousedown') {
      if (button === 0) flags = MOUSEEVENTF_LEFTDOWN
      else if (button === 2) flags = MOUSEEVENTF_RIGHTDOWN
      else if (button === 1) flags = MOUSEEVENTF_MIDDLEDOWN
    } else if (eventName === 'mouseup') {
      if (button === 0) flags = MOUSEEVENTF_LEFTUP
      else if (button === 2) flags = MOUSEEVENTF_RIGHTUP
      else if (button === 1) flags = MOUSEEVENTF_MIDDLEUP
    } else if (eventName === 'click') {
      flags = button === 2 ? (MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP) : (MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP)
    }

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinApiMouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
[WinApiMouse]::SetCursorPos(${screenX}, ${screenY})
${flags > 0 ? `[WinApiMouse]::mouse_event(${flags}, 0, 0, 0, 0)` : ''}
`
    exec(`powershell -NoProfile -NonInteractive -Command "${script.replace(/\r?\n/g, ' ')}"`, { timeout: 1000 }, () => {})
    return true
  }

  handleWheelEvent(payload) {
    const deltaY = typeof payload.deltaY === 'number' ? payload.deltaY : 0
    const scrollAmount = -Math.round(deltaY * 2)

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinApiWheel {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@
[WinApiWheel]::mouse_event(0x0800, 0, 0, ${scrollAmount}, 0)
`
    exec(`powershell -NoProfile -NonInteractive -Command "${script.replace(/\r?\n/g, ' ')}"`, { timeout: 1000 }, () => {})
    return true
  }

  handleKeyEvent(payload) {
    const key = payload.key
    if (!key) return false

    // Safely send keys via System.Windows.Forms.SendKeys
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${key.replace(/'/g, "''")}')
`
    exec(`powershell -NoProfile -NonInteractive -Command "${script.replace(/\r?\n/g, ' ')}"`, { timeout: 1000 }, () => {})
    return true
  }
}

module.exports = { RemoteControlExecutor }
