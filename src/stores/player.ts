"use client";

import { create } from "zustand";

export type PlayerTrack = {
  id: string; // provider id is stable across search/library
  title: string;
  artistName: string;
  previewUrl: string;
  albumImageUrl: string | null;
};

interface PlayerState {
  current: PlayerTrack | null;
  isPlaying: boolean;
  /** Play the track, or toggle pause/resume if it's already the current one. */
  toggle: (track: PlayerTrack) => void;
  stop: () => void;
}

// Single shared <audio> element → only one preview ever plays at a time.
let audio: HTMLAudioElement | null = null;

function getAudio(set: (partial: Partial<PlayerState>) => void): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener("ended", () => set({ isPlaying: false }));
    audio.addEventListener("pause", () => set({ isPlaying: false }));
    audio.addEventListener("play", () => set({ isPlaying: true }));
  }
  return audio;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  isPlaying: false,

  toggle: (track) => {
    if (typeof window === "undefined") return;
    const el = getAudio(set);
    const { current } = get();

    if (current?.id === track.id) {
      if (el.paused) {
        void el.play();
      } else {
        el.pause();
      }
      return;
    }

    el.src = track.previewUrl;
    el.currentTime = 0;
    set({ current: track });
    void el.play().catch(() => set({ isPlaying: false }));
  },

  stop: () => {
    audio?.pause();
    set({ current: null, isPlaying: false });
  },
}));
