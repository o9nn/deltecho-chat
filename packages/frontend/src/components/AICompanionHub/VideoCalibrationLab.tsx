import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Video, Activity } from "lucide-react";
import { Live2DAvatar, Live2DAvatarController } from "./Live2DAvatar";
import "./VideoCalibrationLab.scss";

const VIDEO_FILES = [
  "17824d50-3198-40a4-8069-addabc9a0fb3.mp4",
  "3db2fa59-70b5-4c73-be7b-f8f62a07f75d.mp4",
  "496100b5-7cd5-45c7-a762-f042d8fd412b.mp4",
  "6048a642-d8a5-49c8-beaa-7ced928956f0.mp4",
  "7066b8fc-70cc-4cd9-88c8-f6bd9bd454d2.mp4",
  "7223e61f-1f19-4d69-be8d-ab4d1520b622.mp4",
  "9e3da9ed-88cc-4a4c-87dd-ffb876050587.mp4",
  "ac0509a8-dcfe-493e-bfce-f5220bbc809f.mp4",
  "ad9378cc-aec6-4457-a471-64628b285091.mp4",
  "e2175d0a-2393-4aac-bb72-eec3bb593643.mp4",
  "f49cceaa-e334-437b-9ba0-38db4dd8a009.mp4",
  "f80c13ce-52d2-4aba-bb96-020188025f9c.mp4",
  "fdeccde0-6ae2-4564-8f2f-348bec68d370.mp4",
];

export const VideoCalibrationLab: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState(VIDEO_FILES[0]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [avatarController, setAvatarController] =
    useState<Live2DAvatarController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meterRef.current) {
      meterRef.current.style.setProperty("--progress", `${audioLevel * 100}%`);
    }
  }, [audioLevel]);

  useEffect(() => {
    // Initialize AudioContext on user interaction/mount
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleVideoPlay = () => {
    if (!videoRef.current || !audioContextRef.current || !analyserRef.current)
      return;

    // Resume context if suspended
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    // Connect source if not already connected
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioContextRef.current.createMediaElementSource(
          videoRef.current,
        );
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error("Error connecting audio source:", e);
      }
    }

    setIsPlaying(true);
    analyzeAudio();
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);
    avatarController?.updateLipSync(0);
  };

  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Normalize (0-255 -> 0-1) and apply some gain/threshold
    const normalizedLevel = Math.min(1, (rms / 128) * 1.5);

    setAudioLevel(normalizedLevel);

    // Update avatar lip sync directly
    if (avatarController) {
      avatarController.updateLipSync(normalizedLevel);
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="video-calibration-lab">
      <div className="lab-header">
        <h3>
          <Video size={24} /> Avatar Calibration Lab
        </h3>
        <p>
          Use reference videos to tune avatar lip-sync and expression mapping.
        </p>
      </div>

      <div className="lab-workspace">
        <div className="video-panel">
          <div className="video-container">
            <video
              ref={videoRef}
              src={`/static/videos/${selectedVideo}`}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleVideoPause}
              controls
              crossOrigin="anonymous"
            />
          </div>
          <div className="video-controls">
            <select
              value={selectedVideo}
              onChange={(e) => {
                setSelectedVideo(e.target.value);
                setIsPlaying(false);
              }}
              className="video-selector"
              aria-label="Select reference video"
            >
              {VIDEO_FILES.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
        </div>

        <div className="metrics-panel">
          <div className="metric-card">
            <h4>
              <Volume2 size={16} /> Audio Energy
            </h4>
            <div className="meter-container">
              <div ref={meterRef} className="meter-bar"></div>
            </div>
            <span className="metric-value">
              {(audioLevel * 100).toFixed(0)}%
            </span>
          </div>

          <div className="metric-card">
            <h4>
              <Activity size={16} /> VAD Status
            </h4>
            <div
              className={`status-badge ${
                audioLevel > 0.1 ? "active" : "inactive"
              }`}
            >
              {audioLevel > 0.1 ? "SPEECH DETECTED" : "SILENCE"}
            </div>
          </div>
        </div>
      </div>

      <div className="avatar-panel">
        <div className="avatar-container">
          <Live2DAvatar
            model="shizuku"
            width={400}
            height={400}
            scale={0.35}
            audioLevel={audioLevel}
            onControllerReady={setAvatarController}
          />
        </div>
        <div className="avatar-label">Real-time Lip Sync</div>
      </div>
    </div>
  );
};
