import { toast } from "$lib/toast";
import { island } from "../island.svelte";
import { TRACKS, type Track } from "./tracks";

const playable = TRACKS.filter((t) => t.src);
const SEEK_STEP = 10;

// The audio element is the source of truth. Browser and OS media controls talk to
// it directly, so every state change here comes from its events, never from our
// own buttons, and both stay in sync.
class Player {
    current = $state<Track>(playable[0]!);
    playing = $state(false);
    time = $state(0);
    duration = $state(0);
    #audio: HTMLAudioElement | null = null;
    #loaded: string | null = null;

    play(track: Track = this.current) {
        if (track.href) {
            window.open(track.href, "_blank", "noopener");
            toast("Never gonna give you up", { description: "You just got rickrolled" });
            return;
        }
        this.#load(track)
            .play()
            .catch((e) => console.error(e));
    }

    // Loads the current track's metadata without playing, so its length shows.
    prepare() {
        this.#load(this.current);
    }

    seek(seconds: number) {
        const audio = this.#load(this.current);
        audio.currentTime = Math.min(Math.max(seconds, 0), audio.duration || seconds);
        // Shown right away so the bar doesn't snap back until "seeked" fires.
        this.time = audio.currentTime;
    }

    pause() {
        this.#audio?.pause();
    }

    // Toggles the current track, or switches to `track` if it's a different one.
    toggle(track?: Track) {
        if (track && track.id !== this.current.id) this.play(track);
        else if (this.playing) this.pause();
        else this.play();
    }

    skip(step: 1 | -1) {
        const i = playable.findIndex((t) => t.id === this.current.id);
        this.play(playable[(i + step + playable.length) % playable.length]);
    }

    #load(track: Track) {
        const audio = (this.#audio ??= this.#create());
        if (this.#loaded !== track.id) {
            audio.src = track.src!;
            this.#loaded = track.id;
            this.current = track;
            this.time = 0;
            this.duration = 0;
            this.#describe(track);
        }
        return audio;
    }

    #create() {
        const audio = Object.assign(new Audio(), { loop: true, preload: "metadata" });
        const sync = () => {
            this.playing = !audio.paused;
            if (this.playing) island.show("music", { title: this.current.title, subtitle: this.current.artist }, { id: "music" });
            else island.dismiss("music");
            this.#position();
        };
        audio.addEventListener("play", sync);
        audio.addEventListener("pause", sync);
        audio.addEventListener("timeupdate", () => (this.time = audio.currentTime));
        audio.addEventListener("seeked", () => {
            this.time = audio.currentTime;
            this.#position();
        });
        audio.addEventListener("durationchange", () => {
            this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
            this.#position();
        });

        if ("mediaSession" in navigator) {
            const session = navigator.mediaSession;
            const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
                ["play", () => this.play()],
                ["pause", () => this.pause()],
                ["previoustrack", () => this.skip(-1)],
                ["nexttrack", () => this.skip(1)],
                ["seekto", (d) => d.seekTime != null && this.seek(d.seekTime)],
                ["seekbackward", (d) => this.seek(audio.currentTime - (d.seekOffset ?? SEEK_STEP))],
                ["seekforward", (d) => this.seek(audio.currentTime + (d.seekOffset ?? SEEK_STEP))],
            ];
            for (const [action, handler] of handlers) {
                try {
                    session.setActionHandler(action, handler);
                } catch {
                    // Older browsers throw for actions they don't support.
                }
            }
        }
        return audio;
    }

    // What the browser's media panel and the OS lock screen show.
    #describe(track: Track) {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: "JPA",
            artwork: [{ src: "/logo.webp", sizes: "348x348", type: "image/webp" }],
        });
    }

    #position() {
        const audio = this.#audio;
        if (!audio || !("mediaSession" in navigator)) return;
        navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
        if (!this.duration) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: this.duration,
                position: Math.min(audio.currentTime, this.duration),
                playbackRate: audio.playbackRate,
            });
        } catch {
            // Throws if the values are briefly out of range during a track switch.
        }
    }
}

export const player = new Player();
