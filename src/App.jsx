import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, StopCircle, Play, Image as ImageIcon, Trash2, Download, Mic, MicOff, MonitorPlay, Video, VideoOff, Upload, LayoutTemplate, Smartphone, Pause, FastForward, Rewind, ArrowUp, ArrowDown, Volume2, Music, FlipHorizontal } from 'lucide-react';

// Reproductor de audio estético
const CustomAudioPlayer = ({ audioFile, onDelete }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const aud = audioRef.current;
    if (!aud) return;

    const updateTime = () => setProgress(aud.currentTime);
    const updateDuration = () => setDuration(aud.duration);
    const updatePlayState = () => setIsPlaying(!aud.paused);
    const updateVolume = () => setVolume(aud.volume);

    aud.addEventListener('timeupdate', updateTime);
    aud.addEventListener('loadedmetadata', updateDuration);
    aud.addEventListener('play', updatePlayState);
    aud.addEventListener('pause', updatePlayState);
    aud.addEventListener('volumechange', updateVolume);

    if (aud.readyState >= 1) setDuration(aud.duration);
    setVolume(aud.volume);

    return () => {
      aud.removeEventListener('timeupdate', updateTime);
      aud.removeEventListener('loadedmetadata', updateDuration);
      aud.removeEventListener('play', updatePlayState);
      aud.removeEventListener('pause', updatePlayState);
      aud.removeEventListener('volumechange', updateVolume);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const handleVolume = (e) => {
    const vol = Number(e.target.value);
    try { audioRef.current.volume = Math.min(vol, 1); } catch(err) {}
    setVolume(vol);
    if (audioRef.current.recordGainNode) {
        audioRef.current.recordGainNode.gain.value = vol;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-gray-800 p-3.5 rounded-lg border border-gray-700 shadow-inner flex flex-col gap-3 transition-all hover:border-gray-600">
      <audio id={audioFile.id} ref={audioRef} src={audioFile.url} loop className="hidden" />
      
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p className="text-xs text-gray-200 font-medium truncate" title={audioFile.name}>
            {audioFile.name}
          </p>
        </div>
        <button onClick={() => onDelete(audioFile.id)} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0" title="Eliminar pista">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="p-2 bg-lime-500 hover:bg-lime-400 rounded-full text-gray-900 transition-colors flex-shrink-0 shadow-md shadow-lime-900/20">
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>
        
        <div className="flex-1 flex flex-col gap-1.5">
          <input type="range" min="0" max={duration || 0} step="0.1" value={progress} onChange={handleSeek} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500" />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono leading-none">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Volume2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input 
          type="range" min="0" max="2" step="0.05" value={volume} onChange={handleVolume}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
        />
        <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
};

export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourcesMap = useRef(new Map());
  const micSourceRef = useRef(null);
  const micGainNodeRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameRef = useRef(null);

  const micBarRef = useRef(null);
  const micAnimRef = useRef(null);

  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState(1);
  const [canvasFormat, setCanvasFormat] = useState('horizontal');
  const [currentScene, setCurrentScene] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoInfo, setRecordedVideoInfo] = useState(null);
  const [elements, setElements] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0);

  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  const elementsRef = useRef(elements);
  const audioFilesRef = useRef(audioFiles);
  const selectedIdRef = useRef(selectedId);
  const canvasFormatRef = useRef(canvasFormat);
  const currentSceneRef = useRef(currentScene);
  const isRecordingRef = useRef(isRecording);

  const interactState = useRef({
    action: null, elementId: null, startX: 0, startY: 0,
    startElemX: 0, startElemY: 0, startElemW: 0, startElemH: 0
  });

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { canvasFormatRef.current = canvasFormat; }, [canvasFormat]);
  useEffect(() => { currentSceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const getDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === 'videoinput');
      const audioDevs = devices.filter(d => d.kind === 'audioinput');

      setVideoDevices(videoDevs);
      setAudioDevices(audioDevs);

      setSelectedVideoDevice(prev => prev || (videoDevs.length > 0 ? videoDevs[0].deviceId : ''));
      setSelectedAudioDevice(prev => prev || (audioDevs.length > 0 ? audioDevs[0].deviceId : ''));
    } catch (error) {
      console.error("Error al obtener los dispositivos:", error);
    }
  };

  useEffect(() => {
    getDevices();
    navigator.mediaDevices?.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', getDevices);
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const el = elements.find(e => e.id === selectedId);
    if (el && el.type === 'video') {
      const mediaObj = el.videoObj;
      if (!mediaObj) return;

      setVideoDuration(mediaObj.duration || 0);
      setVideoProgress(mediaObj.currentTime || 0);
      setVideoVolume(mediaObj.muted ? 0 : mediaObj.volume);

      const handleTimeUpdate = () => setVideoProgress(mediaObj.currentTime);
      const handleDurationChange = () => setVideoDuration(mediaObj.duration);
      const handleVolumeChange = () => setVideoVolume(mediaObj.muted ? 0 : mediaObj.volume);

      mediaObj.addEventListener('timeupdate', handleTimeUpdate);
      mediaObj.addEventListener('durationchange', handleDurationChange);
      mediaObj.addEventListener('volumechange', handleVolumeChange);

      return () => {
        mediaObj.removeEventListener('timeupdate', handleTimeUpdate);
        mediaObj.removeEventListener('durationchange', handleDurationChange);
        mediaObj.removeEventListener('volumechange', handleVolumeChange);
      };
    }
  }, [selectedId, elements]);

  const switchScene = useCallback((newScene) => {
    setCurrentScene(prevScene => {
      if (prevScene !== newScene) {
        setElements(prevElements => {
          const updated = [...prevElements];
          updated.forEach(el => {
            if (el.type === 'video' && el.videoObj) {
              const wasVisible = el.scene === prevScene || el.scene === 'todas';
              const isVisible = el.scene === newScene || el.scene === 'todas';
              if (wasVisible && !isVisible) {
                if (!el.videoObj.paused) {
                  el.wasPlaying = true;
                  el.videoObj.pause();
                } else {
                  el.wasPlaying = false;
                }
              } else if (!wasVisible && isVisible) {
                if (el.wasPlaying) {
                  el.videoObj.play().catch(console.error);
                  el.wasPlaying = false;
                }
              }
            }
          });
          return updated;
        });
        setSelectedId(null);
      }
      return newScene;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        switchScene(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchScene]);

  // Función para organizar el orden de las capas (Encima o Debajo)
  const moveLayer = (dir) => {
    setElements(prev => {
        const idx = prev.findIndex(e => e.id === selectedId);
        if (idx < 0) return prev;
        const next = [...prev];
        if (dir === -1 && idx > 0) {
            // Bajar capa
            [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
        } else if (dir === 1 && idx < prev.length - 1) {
            // Subir capa
            [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
        }
        return next;
    });
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high'; // Calidad alta para fluidez en videos

    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentElements = elementsRef.current;
    const currentSelectedId = selectedIdRef.current;
    const currentFormat = canvasFormatRef.current;
    const curScene = currentSceneRef.current;

    currentElements.forEach(el => {
      if (el.scene !== curScene && el.scene !== 'todas') return;

      const layout = el.layouts[currentFormat];
      if (!layout) return;

      ctx.save();
      
      if (el.type === 'camera' && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.filter = 'brightness(0.85) contrast(1.15) saturate(1.1)';
        
        if (el.mirror !== false) {
          ctx.translate(layout.x + layout.w, layout.y);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, layout.w, layout.h);
        } else {
          ctx.drawImage(videoRef.current, layout.x, layout.y, layout.w, layout.h);
        }
        ctx.filter = 'none'; 
      } else if (el.type === 'image' && el.imageObj) {
        ctx.drawImage(el.imageObj, layout.x, layout.y, layout.w, layout.h);
      } else if (el.type === 'video' && el.videoObj && el.videoObj.readyState >= 2) {
        if (el.videoObj.paused) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
        } else {
          ctx.drawImage(el.videoObj, layout.x, layout.y, layout.w, layout.h);
        }
      }

      ctx.restore();

      if (el.id === currentSelectedId && !isRecordingRef.current) {
        ctx.strokeStyle = '#a3e635'; 
        ctx.lineWidth = 4;
        ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);

        ctx.beginPath();
        ctx.arc(layout.x + layout.w, layout.y + layout.h, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#a3e635';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    });

    animationFrameRef.current = requestAnimationFrame(drawCanvas);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [drawCanvas]);


  const toggleVideo = async () => {
    if (isVideoOn) {
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setElements(prev => prev.filter(el => el.type !== 'camera'));
      setIsVideoOn(false);
    } else {
      try {
        const constraints = {
          video: selectedVideoDevice 
            ? { deviceId: { exact: selectedVideoDevice }, width: { ideal: 1920 }, height: { ideal: 1080 } } 
            : { width: { ideal: 1920 }, height: { ideal: 1080 } }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
            const aspect = videoRef.current.videoWidth / videoRef.current.videoHeight;
            const h = 360; const w = h * aspect;

            setElements(prev => [
              ...prev.filter(e => e.type !== 'camera'),
              { 
                id: 'cam_1', 
                type: 'camera', 
                scene: 'todas',
                mirror: true,
                layouts: {
                  horizontal: { x: (1280 - w)/2, y: (720 - h)/2, w, h },
                  vertical: { x: (720 - w)/2, y: (1280 - h)/2, w, h }
                }
              }
            ]);
            setSelectedId('cam_1');
          };
        }
        setIsVideoOn(true);
      } catch (err) {
        console.error("Error cámara:", err);
      }
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
      setIsMicOn(false);
      
      if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
      if (micBarRef.current) micBarRef.current.style.width = '0%';
    } else {
      try {
        const constraints = {
          audio: selectedAudioDevice 
            ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true } 
            : { echoCancellation: true, noiseSuppression: true }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        audioStreamRef.current = stream;
        setIsMicOn(true);

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        const source = ctx.createMediaStreamSource(stream);
        micSourceRef.current = source;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = micVolume;
        micGainNodeRef.current = gainNode;
        
        source.connect(gainNode);
        gainNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateMicLevel = () => {
          if (!micBarRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const percent = Math.min(100, (avg / 128) * 100);
          
          micBarRef.current.style.width = `${percent}%`;
          
          if (percent > 85) micBarRef.current.className = "h-full bg-red-500 transition-all duration-75";
          else if (percent > 60) micBarRef.current.className = "h-full bg-yellow-400 transition-all duration-75";
          else micBarRef.current.className = "h-full bg-lime-500 transition-all duration-75";
          
          micAnimRef.current = requestAnimationFrame(updateMicLevel);
        };
        updateMicLevel();

      } catch (err) {
        console.error("Error micrófono:", err);
      }
    }
  };

  const addMediaElement = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideoFile = file.type.startsWith('video/');
    const isAudioFile = file.type.startsWith('audio/');

    if (isVideoFile) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.muted = false; 
      vid.loop = true;
      vid.onloadedmetadata = () => {
        const aspectRatio = vid.videoWidth / vid.videoHeight;
        const h = 200; const w = h * aspectRatio;
        const newId = `vid_${Date.now()}`;
        setElements(prev => [
          ...prev,
          { 
            id: newId, 
            type: 'video', 
            scene: currentScene,
            videoObj: vid, 
            layouts: { horizontal: { x: 50, y: 50, w, h }, vertical: { x: 50, y: 50, w, h } }
          }
        ]);
        setSelectedId(newId);
      };
    } else if (isAudioFile) {
      setAudioFiles(prev => [...prev, { id: `aud_${Date.now()}`, url: url, name: file.name }]);
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const h = 200; const w = h * aspectRatio;
        const newId = `img_${Date.now()}`;
        setElements(prev => [
          ...prev,
          { 
            id: newId, 
            type: 'image', 
            scene: currentScene,
            imageObj: img, 
            layouts: { horizontal: { x: 50, y: 50, w, h }, vertical: { x: 50, y: 50, w, h } }
          }
        ]);
        setSelectedId(newId);
      };
    }
    e.target.value = null; 
  };

  const startRecording = () => {
    if (!canvasRef.current) return;
    recordedChunksRef.current = [];
    
    const canvasStream = canvasRef.current.captureStream(60);
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;
    const dest = audioCtx.createMediaStreamDestination();

    if (audioStreamRef.current && micGainNodeRef.current) {
        micGainNodeRef.current.connect(dest);
    }
    
    elementsRef.current.forEach(el => {
        if (el.type === 'video' && el.videoObj) {
            let source = audioSourcesMap.current.get(el.videoObj);
            if (!source) {
                source = audioCtx.createMediaElementSource(el.videoObj);
                audioSourcesMap.current.set(el.videoObj, source);
            }
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = el.videoObj.muted ? 0 : el.videoObj.volume;
            el.videoObj.recordGainNode = gainNode;

            source.disconnect(); 
            source.connect(gainNode);
            gainNode.connect(dest); 
            gainNode.connect(audioCtx.destination); 
        }
    });

    audioFilesRef.current.forEach(af => {
        const aEl = document.getElementById(af.id);
        if (aEl) {
            let source = audioSourcesMap.current.get(aEl);
            if (!source) {
                source = audioCtx.createMediaElementSource(aEl);
                audioSourcesMap.current.set(aEl, source);
            }
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = aEl.volume;
            aEl.recordGainNode = gainNode;

            source.disconnect();
            source.connect(gainNode);
            gainNode.connect(dest);
            gainNode.connect(audioCtx.destination);
        }
    });

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(), 
      ...dest.stream.getAudioTracks()
    ]);
    
    // FORMATO WEBM PARA MENOR PESO Y MAYOR ESTABILIDAD
    let mimeType = 'video/webm;codecs=vp9,opus';
    let ext = 'webm';
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
    }

    mediaRecorderRef.current = new MediaRecorder(combinedStream, { 
      mimeType: mimeType, 
      videoBitsPerSecond: 5000000, // Ajustado a 5Mbps para optimizar peso en WebM
      audioBitsPerSecond: 320000 
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedVideoInfo({ url, extension: ext });
    };

    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteSelected = () => {
    if (selectedId) {
      const el = elements.find(e => e.id === selectedId);
      if (el && el.videoObj) el.videoObj.pause();
      setElements(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getMousePos(e);
    let found = false;
    const format = canvasFormat;

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const layout = el.layouts[format];
      if (!layout || (el.scene !== currentScene && el.scene !== 'todas')) continue;
      
      const isResizeHandle = x >= layout.x + layout.w - 30 && x <= layout.x + layout.w + 30 &&
                             y >= layout.y + layout.h - 30 && y <= layout.y + layout.h + 30;
      const isInside = x >= layout.x && x <= layout.x + layout.w && y >= layout.y && y <= layout.y + layout.h;

      if (el.id === selectedId && isResizeHandle) {
        interactState.current = { action: 'resize', elementId: el.id, startX: x, startY: y, startElemW: layout.w, startElemH: layout.h };
        found = true; break;
      } else if (isInside) {
        setSelectedId(el.id);
        interactState.current = { action: 'drag', elementId: el.id, startX: x, startY: y, startElemX: layout.x, startElemY: layout.y };
        found = true; break;
      }
    }
    if (!found) setSelectedId(null);
  };

  const handlePointerMove = (e) => {
    const state = interactState.current;
    if (!state.action) return;
    const { x, y } = getMousePos(e);
    const format = canvasFormat;

    setElements(prev => prev.map(el => {
      if (el.id !== state.elementId) return el;
      const currentLayout = el.layouts[format];
      if (state.action === 'drag') {
        return { ...el, layouts: { ...el.layouts, [format]: { ...currentLayout, x: state.startElemX + (x - state.startX), y: state.startElemY + (y - state.startY) } } };
      } else if (state.action === 'resize') {
        const aspect = state.startElemW / state.startElemH;
        let newW = state.startElemW + (x - state.startX);
        if (newW < 80) newW = 80;
        return { ...el, layouts: { ...el.layouts, [format]: { ...currentLayout, w: newW, h: newW / aspect } } };
      }
      return el;
    }));
  };

  const handlePointerUp = () => { interactState.current = { action: null }; };

  const formatTimeUI = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-6 h-6 text-lime-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-lime-400 to-green-500 bg-clip-text text-transparent uppercase">ESTUDIO ELPZN</h1>
        </div>
        {isRecording && <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 animate-pulse">Grabando</div>}
      </header>

      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 max-w-[1800px] mx-auto w-full">
        <div className="w-full xl:w-72 flex flex-col gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Fuentes</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                  <button onClick={toggleVideo} className={`flex items-center justify-center gap-2 w-full py-2 rounded-md font-medium border ${isVideoOn ? 'bg-red-500/10 text-red-400' : 'bg-gray-800 text-gray-200'}`}>Cámara</button>
                  {videoDevices.length > 0 && (
                      <select value={selectedVideoDevice} onChange={(e) => setSelectedVideoDevice(e.target.value)} className="mt-1 w-full bg-gray-950 text-[10px] p-1.5 rounded border border-gray-800 outline-none text-gray-400">
                          {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Cámara'}</option>)}
                      </select>
                  )}
              </div>
              
              <div className="flex flex-col">
                  <button onClick={toggleMic} className={`flex items-center justify-center gap-2 w-full py-2 rounded-md font-medium border ${isMicOn ? 'bg-slate-800 border-lime-500/30 text-lime-400' : 'bg-gray-800 text-gray-200 border-transparent'}`}>Micrófono</button>
                  {audioDevices.length > 0 && (
                      <select value={selectedAudioDevice} onChange={(e) => setSelectedAudioDevice(e.target.value)} className="mt-1 w-full bg-gray-950 text-[10px] p-1.5 rounded border border-gray-800 outline-none text-gray-400">
                          {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Micrófono'}</option>)}
                      </select>
                  )}
                  <div className="flex flex-col gap-1 w-full mt-2 bg-gray-800/50 p-2 rounded-md border border-gray-700/50">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nivel de Mic</span>
                          {isMicOn ? <Mic size={12} className="text-lime-400" /> : <MicOff size={12} className="text-gray-600" />}
                      </div>
                      <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                          <div ref={micBarRef} className="h-full bg-lime-500 w-0 transition-all duration-75"></div>
                      </div>
                      <div className="flex items-center gap-2 mt-1" title="Amplificación del Micrófono">
                          <Volume2 size={12} className="text-gray-400" />
                          <input type="range" min="0" max="3" step="0.1" value={micVolume} 
                            onChange={(e) => {
                                const vol = Number(e.target.value);
                                setMicVolume(vol);
                                if (micGainNodeRef.current) micGainNodeRef.current.gain.value = vol;
                            }} 
                            className="w-full h-1.5 accent-lime-500 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                          />
                          <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{Math.round(micVolume * 100)}%</span>
                      </div>
                  </div>
              </div>

              <label className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 border border-gray-700 rounded-md font-medium cursor-pointer hover:bg-gray-700 transition-colors mt-2">
                <Upload size={18} /> Subir Medio
                <input type="file" onChange={addMediaElement} className="hidden" accept="image/*,video/*,audio/*" />
              </label>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg mt-auto">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 text-center">Grabación</h2>
            {!isRecording ? (
              <button onClick={startRecording} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-semibold transition-colors flex justify-center items-center gap-2">
                  <Play size={18} className="fill-current"/> Iniciar
              </button>
            ) : (
              <button onClick={stopRecording} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold animate-pulse transition-colors flex justify-center items-center gap-2">
                  <StopCircle size={18}/> Detener
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 items-center">
          <div className="flex gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
            {[1, 2, 3, 4].map(num => (
              <button key={num} onClick={() => switchScene(num.toString())} className={`px-4 py-2 rounded-md text-sm font-bold ${currentScene === num.toString() ? 'bg-lime-500 text-gray-900' : 'text-gray-400 hover:bg-gray-800'}`}>Escena {num}</button>
            ))}
          </div>
          <div className={`relative bg-black rounded-lg overflow-hidden border border-gray-800 ${canvasFormat === 'horizontal' ? 'w-full aspect-video' : 'h-[70vh] aspect-[9/16]'}`}>
            <canvas ref={canvasRef} width={canvasFormat === 'horizontal' ? 1280 : 720} height={canvasFormat === 'horizontal' ? 720 : 1280} className="w-full h-full" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
            <video ref={videoRef} className="hidden" />
          </div>
          {recordedVideoInfo && !isRecording && (
            <div className="flex gap-3 mt-2 bg-gray-900 p-2 rounded-full border border-gray-800 animate-in zoom-in duration-300">
              <a href={recordedVideoInfo.url} download={`grabacion_estudio.${recordedVideoInfo.extension}`} className="px-5 py-2 bg-lime-500 text-slate-900 rounded-full text-sm font-bold shadow-md hover:bg-lime-400 transition-colors flex items-center gap-2">
                  <Download size={16}/> Descargar {recordedVideoInfo.extension.toUpperCase()}
              </a>
              <button onClick={() => setRecordedVideoInfo(null)} className="px-5 py-2 bg-red-600/10 text-red-400 rounded-full text-sm font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors">
                  <Trash2 size={16}/>
              </button>
            </div>
          )}
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg flex-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 tracking-widest">Propiedades</h2>
            {selectedId ? (
              <div className="space-y-4 text-center">
                <div className="space-y-2">
                   <p className="text-[10px] text-gray-400 uppercase font-bold">Mostrar en escena:</p>
                   <select value={selectedElement?.scene || 'todas'} onChange={(e) => setElements(prev => prev.map(el => el.id === selectedId ? {...el, scene: e.target.value} : el))} className="w-full bg-gray-800 p-2 rounded border border-gray-700 outline-none text-sm text-gray-200">
                      <option value="1">Escena 1</option><option value="2">Escena 2</option>
                      <option value="3">Escena 3</option><option value="4">Escena 4</option>
                      <option value="todas">Todas</option>
                   </select>
                </div>

                {/* BOTONES DE CAPAS RESTAURADOS */}
                <div className="flex gap-2">
                    <button onClick={() => moveLayer(-1)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm border border-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-all">
                        <ArrowDown size={16}/> Bajar Capa
                    </button>
                    <button onClick={() => moveLayer(1)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm border border-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-all">
                        <ArrowUp size={16}/> Subir Capa
                    </button>
                </div>

                {selectedElement?.type === 'camera' && (
                    <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, mirror: !el.mirror} : el))} className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm border border-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-all mt-4">
                        <FlipHorizontal size={16}/> Alternar Modo Espejo
                    </button>
                )}

                {selectedElement?.type === 'video' && (
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 space-y-3 mt-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Control Video</p>
                      <div className="flex justify-center gap-3">
                          <button onClick={() => selectedElement.videoObj.currentTime = Math.max(0, selectedElement.videoObj.currentTime - 5)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"><Rewind size={16}/></button>
                          <button onClick={() => selectedElement.videoObj.paused ? selectedElement.videoObj.play() : selectedElement.videoObj.pause()} className="p-2 bg-lime-500 hover:bg-lime-400 rounded-full text-slate-900 shadow-lg">
                            {selectedElement.videoObj.paused ? <Play size={16} className="fill-current"/> : <Pause size={16} className="fill-current"/>}
                          </button>
                          <button onClick={() => { selectedElement.videoObj.pause(); selectedElement.videoObj.currentTime = 0; }} className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-full text-red-400 transition-colors"><StopCircle size={16}/></button>
                          <button onClick={() => selectedElement.videoObj.currentTime = Math.min(selectedElement.videoObj.duration, selectedElement.videoObj.currentTime + 5)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"><FastForward size={16}/></button>
                      </div>
                      
                      <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                              <span>{formatTimeUI(videoProgress)}</span>
                              <span>{formatTimeUI(videoDuration)}</span>
                          </div>
                          <input type="range" min="0" max={videoDuration || 100} step="0.1" value={videoProgress} onChange={(e) => selectedElement.videoObj.currentTime = Number(e.target.value)} className="w-full h-1.5 accent-lime-500 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                          <Volume2 size={16} className="text-gray-400" />
                          <input type="range" min="0" max="2" step="0.05" value={videoVolume} 
                            onChange={(e) => {
                                const vol = Number(e.target.value);
                                try { selectedElement.videoObj.volume = Math.min(vol, 1); } catch(err){}
                                setVideoVolume(vol);
                                if (selectedElement.videoObj.recordGainNode) {
                                    selectedElement.videoObj.recordGainNode.gain.value = vol;
                                }
                            }} 
                            className="w-full h-1.5 accent-lime-500 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                          />
                          <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{Math.round(videoVolume * 100)}%</span>
                      </div>
                    </div>
                )}

                <button onClick={deleteSelected} className="w-full py-2.5 bg-red-600/10 text-red-400 rounded-md border border-red-500/20 hover:bg-red-600/20 mt-2 text-sm font-bold uppercase transition-colors">Eliminar elemento</button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic text-center py-10 flex flex-col items-center gap-3"><LayoutTemplate size={30}/>Seleccione un elemento visual</p>
            )}
          </div>
          {audioFiles.length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg max-h-80 overflow-y-auto">
               <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 tracking-widest">Audios</h2>
               <div className="flex flex-col gap-3">
                 {audioFiles.map(af => (
                    <CustomAudioPlayer key={af.id} audioFile={af} onDelete={(id) => setAudioFiles(prev => prev.filter(a => a.id !== id))} />
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
