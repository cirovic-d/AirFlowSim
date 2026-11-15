import { useT } from "../lib/i18n";

interface Props {
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  onRestart: () => void;
  fanSpeed: number;
  onFanSpeed: (speed: number) => void;
}

export function AnimationBar({ playing, onPlaying, onRestart, fanSpeed, onFanSpeed }: Props) {
  const t = useT();

  return (
    <div className="anim-bar">
      <button className="btn icon" onClick={() => onPlaying(!playing)} title={t(playing ? "pause" : "play")}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4 2.5v11l9-5.5z" />}
        </svg>
        {t(playing ? "pause" : "play")}
      </button>
      <button className="btn icon" onClick={onRestart} title={t("restart")}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" />
        </svg>
        {t("restart")}
      </button>

      <label className="speed" title={t("fanSpeedNote")}>
        <span className="muted">{t("fanSpeed")}</span>
        <input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          value={fanSpeed}
          onChange={(e) => onFanSpeed(e.target.valueAsNumber)}
        />
        <span className="speed-value">{Math.round(fanSpeed * 100)}%</span>
      </label>

      <span className="anim-hint">{t("interactionHint")}</span>
    </div>
  );
}
