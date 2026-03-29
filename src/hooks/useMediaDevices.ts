import { useCallback, useEffect, useRef, useState } from "react"

export interface MediaDevice {
  deviceId: string
  label: string
  kind: "audioinput" | "videoinput"
}

export interface UseMediaDevicesReturn {
  cameraStream: MediaStream | null
  micStream: MediaStream | null
  devices: MediaDevice[]
  isLoading: boolean
  error: string | null
  selectCamera: (deviceId: string) => Promise<void>
  selectMic: (deviceId: string) => Promise<void>
  startCamera: () => Promise<MediaStream>
  startMic: () => Promise<MediaStream>
  stopCamera: () => void
  stopMic: () => void

  // 设备开关
  isCameraEnabled: boolean
  isMicEnabled: boolean
  toggleCamera: () => Promise<void>
  toggleMic: () => Promise<void>
  getCameraStream: () => MediaStream | null
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDevice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [selectedMic, setSelectedMic] = useState<string>("")

  // 用 ref 存储 stream 以便同步访问（绕过 React 状态批处理）
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  // 设备开关状态
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isMicEnabled, setIsMicEnabled] = useState(true)

  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      const mediaDevices: MediaDevice[] = deviceList
        .filter((d) => d.kind === "audioinput" || d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as "audioinput" | "videoinput",
        }))
      setDevices(mediaDevices)
    } catch (err) {
      console.error("Failed to enumerate devices:", err)
    }
  }, [])

  useEffect(() => {
    refreshDevices()
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices)
    }
  }, [refreshDevices])

  const startCamera = useCallback(async (): Promise<MediaStream> => {
    if (cameraStreamRef.current) return cameraStreamRef.current // 已在运行
    setIsLoading(true)
    setError(null)
    try {
      let stream: MediaStream

      // 优先使用已选设备
      if (selectedCamera) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedCamera } },
          })
        } catch {
          // 清除无效选择，使用默认设备
          setSelectedCamera("")
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          })
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
      }

      cameraStreamRef.current = stream
      setCameraStream(stream)
      return stream
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access camera")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [selectedCamera])

  const startMic = useCallback(async (): Promise<MediaStream> => {
    if (micStreamRef.current) return micStreamRef.current // 已在运行
    setError(null)
    try {
      let stream: MediaStream

      // 优先使用已选设备
      if (selectedMic) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: selectedMic } },
          })
        } catch {
          // 清除无效选择，使用默认设备
          setSelectedMic("")
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
      }

      micStreamRef.current = stream
      setMicStream(stream)
      return stream
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone")
      throw err
    }
  }, [selectedMic])

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      setCameraStream(null)
    }
  }, [])

  const stopMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
      setMicStream(null)
    }
  }, [])

  const selectCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId)
    if (cameraStreamRef.current) {
      stopCamera()
      await startCamera()
    }
  }, [stopCamera, startCamera])

  const selectMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId)
    if (micStreamRef.current) {
      stopMic()
      await startMic()
    }
  }, [stopMic, startMic])

  // 摄像头开关
  const toggleCamera = useCallback(async () => {
    if (isCameraEnabled) {
      stopCamera()
      setIsCameraEnabled(false)
    } else {
      try {
        await startCamera()
        setIsCameraEnabled(true)
      } catch (err) {
        console.error("Failed to start camera:", err)
      }
    }
  }, [isCameraEnabled, startCamera, stopCamera])

  // 麦克风开关
  const toggleMic = useCallback(async () => {
    if (isMicEnabled) {
      stopMic()
      setIsMicEnabled(false)
    } else {
      try {
        await startMic()
        setIsMicEnabled(true)
      } catch (err) {
        console.error("Failed to start mic:", err)
      }
    }
  }, [isMicEnabled, startMic, stopMic])

  // 同步获取当前 stream
  const getCameraStream = useCallback(() => cameraStreamRef.current, [])

  // 卸载时清理
  useEffect(() => {
    return () => {
      stopCamera()
      stopMic()
    }
  }, [stopCamera, stopMic])

  return {
    cameraStream,
    micStream,
    devices,
    isLoading,
    error,
    selectCamera,
    selectMic,
    startCamera,
    startMic,
    stopCamera,
    stopMic,

    isCameraEnabled,
    isMicEnabled,
    toggleCamera,
    toggleMic,
    getCameraStream,
  }
}
