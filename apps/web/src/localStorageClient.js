import { isElectron } from './electronAuth'
import * as AwsClient from './reelmsAwsClient'

// Get IPC renderer (only available in Electron)
const getIpc = () => {
  if (!isElectron) return null
  return window.require?.('electron')?.ipcRenderer
}

// ── File Operations ────────────────────────────────────────────────────────

export async function uploadFileLocally(fileName, fileBuffer, metadata = {}) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:save-file', fileName, fileBuffer, metadata)
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to upload file locally:', err.message)
    throw err
  }
}

export async function readFileLocally(fileId) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:read-file', fileId)
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to read file locally:', err.message)
    throw err
  }
}

export async function deleteFileLocally(fileId) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:delete-file', fileId)
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to delete file locally:', err.message)
    throw err
  }
}

export async function listFilesLocally() {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:list-files')
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to list files locally:', err.message)
    throw err
  }
}

export async function getUnsyncedFilesLocally() {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:get-unsynced')
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to get unsynced files:', err.message)
    throw err
  }
}

export async function markFileSyncedLocally(fileId, syncId) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:mark-synced', fileId, syncId)
    if (!result.success) throw new Error(result.error)
    return result
  } catch (err) {
    console.error('Failed to mark file as synced:', err.message)
    throw err
  }
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function setPreferenceLocally(key, value) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:set-preference', key, value)
    if (!result.success) throw new Error(result.error)
    return result
  } catch (err) {
    console.error('Failed to set preference:', err.message)
    throw err
  }
}

export async function getPreferenceLocally(key, defaultValue = null) {
  const ipc = getIpc()
  if (!ipc) throw new Error('Local storage only available on Electron')

  try {
    const result = await ipc.invoke('local-storage:get-preference', key, defaultValue)
    if (!result.success) throw new Error(result.error)
    return result.data
  } catch (err) {
    console.error('Failed to get preference:', err.message)
    throw err
  }
}

// ── Utility: Handle file input and upload ──────────────────────────────────

export async function handleFileInput(file) {
  const buffer = await file.arrayBuffer()
  return uploadFileLocally(file.name, Buffer.from(buffer), {
    mimeType: file.type,
    originalSize: file.size
  })
}

// ── Utility: Sync file to AWS ──────────────────────────────────────────────

/**
 * Sync file to AWS (register metadata and optionally upload binary)
 * @param {string} fileId - Local file ID
 * @param {Object} options - Sync options
 * @param {boolean} options.uploadBinary - Whether to upload binary file (default: false)
 * @returns {Promise<Object>} AWS metadata response
 */
export async function syncFileToAws(fileId, options = {}) {
  try {
    const { data, metadata } = await readFileLocally(fileId)

    // Register metadata in AWS (always do this)
    const awsMetadata = await AwsClient.mediaUploadMetadata(
      metadata.name,
      metadata.size,
      metadata.mimeType || 'application/octet-stream',
      fileId
    )

    // Mark as synced in local store
    if (awsMetadata?.id) {
      await markFileSyncedLocally(fileId, awsMetadata.id)
    }

    return awsMetadata
  } catch (err) {
    console.error('Failed to sync file to AWS:', err.message)
    throw err
  }
}

/**
 * Sync all unsynced files to AWS
 * @returns {Promise<Array>} Array of synced file metadata
 */
export async function syncAllUnsyncedFiles() {
  try {
    const unsyncedFiles = await getUnsyncedFilesLocally()
    const results = []

    for (const file of unsyncedFiles) {
      try {
        const result = await syncFileToAws(file.id)
        results.push(result)
      } catch (err) {
        console.error(`Failed to sync file ${file.id}:`, err.message)
      }
    }

    return results
  } catch (err) {
    console.error('Failed to sync unsynced files:', err.message)
    throw err
  }
}

/**
 * Share media (make public for cross-platform access)
 * @param {string} mediaId - AWS media ID
 * @param {boolean} isPublic - Whether to make public
 * @returns {Promise<Object>} Updated media metadata
 */
export async function shareMedia(mediaId, isPublic = true) {
  try {
    return await AwsClient.mediaShare(mediaId, isPublic)
  } catch (err) {
    console.error('Failed to share media:', err.message)
    throw err
  }
}
