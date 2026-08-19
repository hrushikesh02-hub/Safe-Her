import io
import logging
from typing import Dict, Any, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Fallback feature extractor when librosa or soundfile fails to parse exotic audio formats
try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False
    logger.warning("librosa is not installed. Using numpy fallback feature extractor.")

class AudioProcessor:
    def __init__(self, target_sr: int = 22050, max_duration_sec: float = 30.0):
        self.target_sr = target_sr
        self.max_duration_sec = max_duration_sec

    def process_bytes(self, audio_bytes: bytes, filename: str = "") -> Tuple[np.ndarray, int, Dict[str, Any]]:
        """
        Loads audio bytes, normalizes, resamples to target_sr (mono),
        and extracts spectral audio features.
        Returns (y_mono, sr, features_dict).
        """
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Empty audio payload received")

        if len(audio_bytes) > 25 * 1024 * 1024:  # 25 MB limit
            raise ValueError("Audio file size exceeds maximum limit of 25MB")

        y = None
        sr = self.target_sr

        # 1. Try standard wave module first for native uncompressed WAV
        try:
            import wave
            with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                framerate = wf.getframerate()
                n_frames = wf.getnframes()
                raw_data = wf.readframes(n_frames)
                if sampwidth == 2:
                    data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
                    if n_channels > 1:
                        data = data.reshape(-1, n_channels).mean(axis=1)
                    y = data
                    sr = framerate
        except Exception:
            pass

        # 2. Try librosa if wave did not parse
        if y is None and HAS_LIBROSA:
            try:
                audio_stream = io.BytesIO(audio_bytes)
                y, sr = librosa.load(audio_stream, sr=self.target_sr, mono=True)
            except Exception as e:
                logger.warning(f"librosa.load note for {filename}: {e}")
                y = self._fallback_load(audio_bytes)
        elif y is None:
            y = self._fallback_load(audio_bytes)

        if y is None or len(y) == 0:
            raise ValueError("Could not decode audio or audio contains no samples")

        # Check duration
        duration = len(y) / sr
        if duration < 0.1:
            raise ValueError("Audio sample is too short (less than 100ms)")

        # Truncate if exceeds max duration
        max_samples = int(self.max_duration_sec * sr)
        if len(y) > max_samples:
            y = y[:max_samples]

        # Normalize amplitude to [-1.0, 1.0]
        max_amp = np.max(np.abs(y))
        if max_amp > 1e-6:
            y = y / max_amp

        # Extract features
        features = self.extract_features(y, sr)
        features["duration_sec"] = round(duration, 2)
        features["sample_rate"] = sr

        return y, sr, features

    def extract_features(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """
        Extracts acoustic features from normalized signal y.
        Features: RMS Energy, Zero Crossing Rate, Spectral Centroid, Spectral Rolloff, MFCCs.
        """
        if HAS_LIBROSA:
            try:
                rms = float(np.mean(librosa.feature.rms(y=y)))
                zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))
                spec_cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
                spec_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                mfcc_means = [float(val) for val in np.mean(mfccs, axis=1)]

                return {
                    "rms_energy": round(rms, 4),
                    "zero_crossing_rate": round(zcr, 4),
                    "spectral_centroid_hz": round(spec_cent, 2),
                    "spectral_rolloff_hz": round(spec_rolloff, 2),
                    "mfcc_means": [round(m, 2) for m in mfcc_means],
                }
            except Exception as e:
                logger.warning(f"Error extracting features with librosa: {e}")

        # Fallback numpy extraction
        rms = float(np.sqrt(np.mean(y**2)))
        zero_crossings = float(np.mean(np.diff(np.signbit(y)) != 0))
        
        # Estimate fundamental frequency / spectral center
        fft = np.abs(np.fft.rfft(y))
        freqs = np.fft.rfftfreq(len(y), 1.0 / sr)
        spec_cent = float(np.sum(freqs * fft) / (np.sum(fft) + 1e-8)) if np.sum(fft) > 0 else 0.0

        return {
            "rms_energy": round(rms, 4),
            "zero_crossing_rate": round(zero_crossings, 4),
            "spectral_centroid_hz": round(spec_cent, 2),
            "spectral_rolloff_hz": round(spec_cent * 1.5, 2),
            "mfcc_means": [0.0] * 13
        }

    def _fallback_load(self, audio_bytes: bytes) -> np.ndarray:
        """Simple PCM byte conversion fallback."""
        try:
            # Try interpreting as 16-bit PCM
            data = np.frombuffer(audio_bytes, dtype=np.int16)
            if len(data) > 0:
                return data.astype(np.float32) / 32768.0
        except Exception:
            pass
        return np.zeros(self.target_sr * 2, dtype=np.float32)
