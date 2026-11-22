/**
 * 音频服务：项目中唯一直接操作 <audio> 的地方
 * 职责：播放 / 暂停 / 换源 / 跳转 / 音量 / 静音 / 销毁
 * 为什么单独一层：桌面端可能换成原生音频实现，届时只替换这里，上层无感
 */
// 创建音频服务
export function createAudioService() {
  // 创建浏览器音频对象
  const audio = new Audio()

  // 获取音频对象
  function getAudio() {
    return audio
  }

  // 播放音频
  function play() {
    return audio.play()
  }

  // 暂停音频
  function pause() {
    audio.pause()
  }

  // 设置音频地址
  function setSource(url) {
    audio.src = url
  }

  // 跳转播放位置
  function seek(time) {
    audio.currentTime = time
  }

  // 停止并清空音频
  function stop() {
    audio.pause()
    audio.src = ''
  }

  // 设置音量（0~1）
  function setVolume(value) {
    const number = Number(value)
    audio.volume = Number.isFinite(number)
      ? Math.min(Math.max(number, 0), 1)
      : 0
    return audio.volume
  }

  // 获取音量
  function getVolume() {
    return audio.volume
  }

  // 设置静音
  function setMuted(muted) {
    audio.muted = Boolean(muted)
    return audio.muted
  }

  // 是否静音
  function getMuted() {
    return audio.muted
  }

  // 销毁音频服务
  function destroy() {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  return {
    getAudio,
    play,
    pause,
    setSource,
    seek,
    stop,
    setVolume,
    getVolume,
    setMuted,
    getMuted,
    destroy
  }
}
