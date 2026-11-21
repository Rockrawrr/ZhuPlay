
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
    destroy
  }
}
