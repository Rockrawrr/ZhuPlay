
import { onUnmounted } from "vue";

// 音频播放逻辑
export function useAudioPlayer({
  songs,
  currentSong,
  isShuffle,
  repeatMode,
  duration,
  playerStore,
  musicStore,
  musicStorage,
  audioService,
}) {
  // 获取音频对象
  const audio = audioService.getAudio();

  // 播放歌曲
  function playSong(song) {
    if (!song) return;

    // 如果点击的是当前歌曲，则切换播放状态
    if (currentSong.value?.id === song.id) {
      togglePlay();
      return;
    }

    // 更新最近播放记录
    musicStore.addRecentSong(song);

    // 保存最近播放记录
    musicStorage
      .saveMusicData(
        "recentSongIds",
        musicStore.recentSongs.map((item) => item.id),
      )
      .catch((error) => {
        console.error("最近播放记录保存失败：", error);
      });

    // 更新当前歌曲
    playerStore.setCurrentSong(song);

    // 设置音频地址
    audioService.setSource(song.url);

    // 开始播放
    audioService
      .play()
      .then(() => {
        playerStore.setPlaying(true);
      })
      .catch((error) => {
        console.error("播放失败：", error);
        playerStore.setPlaying(false);
      });
  }

  // 播放上一首
  function playPrevious() {
    if (songs.value.length === 0) return;

    const currentIndex = songs.value.findIndex(
      (song) => song.id === currentSong.value?.id,
    );

    const previousIndex =
      currentIndex <= 0 ? songs.value.length - 1 : currentIndex - 1;

    playSong(songs.value[previousIndex]);
  }

  // 播放下一首
  function playNext() {
    if (songs.value.length === 0) return;

    // 开启随机播放
    if (isShuffle.value && songs.value.length > 1) {
      const currentIndex = songs.value.findIndex(
        (song) => song.id === currentSong.value?.id,
      );

      let nextIndex;

      // 随机选择一首不同的歌曲
      do {
        nextIndex = Math.floor(Math.random() * songs.value.length);
      } while (nextIndex === currentIndex);

      playSong(songs.value[nextIndex]);
      return;
    }

    // 关闭随机播放：按照列表顺序播放
    const currentIndex = songs.value.findIndex(
      (song) => song.id === currentSong.value?.id,
    );

    const nextIndex =
      currentIndex >= songs.value.length - 1 ? 0 : currentIndex + 1;

    playSong(songs.value[nextIndex]);
  }

  // 播放 / 暂停
  function togglePlay() {
    if (!currentSong.value) return;

    if (audio.paused) {
      audioService
        .play()
        .then(() => {
          playerStore.setPlaying(true);
        })
        .catch((error) => {
          console.error("播放失败：", error);
          playerStore.setPlaying(false);
        });
    } else {
      audioService.pause();
      playerStore.setPlaying(false);
    }
  }

  // 跳转到指定播放位置
  function seek(time) {
    if (!duration.value) return;

    const targetTime = Math.max(0, Math.min(time, duration.value));

    audioService.seek(targetTime);
    playerStore.setCurrentTime(audio.currentTime);
  }

  // 监听播放进度
  function handleTimeUpdate() {
    playerStore.setCurrentTime(audio.currentTime);
  }

  // 获取歌曲总时长
  function handleLoadedMetadata() {
    playerStore.setDuration(audio.duration || 0);
  }

  // 播放结束时更新状态
  function handleEnded() {
    // 单曲循环
    if (repeatMode.value === "one") {
      audioService.seek(0);

      audioService.play().catch((error) => {
        console.error("单曲循环播放失败：", error);
        playerStore.setPlaying(false);
      });

      return;
    }

    // 关闭循环，且没有下一首
    if (
      repeatMode.value === "off" &&
      !isShuffle.value &&
      songs.value.findIndex(
        (song) => song.id === currentSong.value?.id,
      ) === songs.value.length - 1
    ) {
      playerStore.setPlaying(false);
      playerStore.setCurrentTime(duration.value);
      return;
    }

    // 其他情况播放下一首
    playNext();
  }

  // 注册音频事件
  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  audio.addEventListener("ended", handleEnded);

  // 组件卸载时移除监听并销毁音频服务
  onUnmounted(() => {
    audio.removeEventListener("timeupdate", handleTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    audio.removeEventListener("ended", handleEnded);

    audioService.destroy();
  });

  return {
    playSong,
    playPrevious,
    playNext,
    togglePlay,
    seek,
  };
}
