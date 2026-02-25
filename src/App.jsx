import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, StopCircle, Play, Image as ImageIcon, Trash2, 
  Download, Mic, MicOff, MonitorPlay, Video, VideoOff, 
  Upload, Presentation, Pause, FastForward, 
  Rewind, ArrowUp, ArrowDown, Volume2, Music, FlipHorizontal,
  ChevronLeft, ChevronRight, LayoutTemplate, RotateCcw
} from 'lucide-react';

// --- COMPONENTE PARA PISTAS DE AUDIO ---
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
    
    aud.addEventListener('timeupdate', updateTime);
    aud.addEventListener('loadedmetadata', updateDuration);
    aud.addEventListener('play', updatePlayState);
    aud.addEventListener('pause', updatePlayState);
    
    return () => {
      aud.removeEventListener('timeupdate', updateTime);
      aud.removeEventListener('loadedmetadata', updateDuration);
      aud.removeEventListener('play', updatePlayState);
      aud.removeEventListener('pause', updatePlayState);
    };
  }, []);

  const formatTime = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col gap-3 shadow-inner transition-all hover:border-slate-600">
      <audio id={audioFile.id} ref={audioRef} src={audioFile.url} loop className="hidden" />
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p className="text-[11px] font-bold text-slate-200 truncate" title={audioFile.name}>{audioFile.name}</p>
        </div>
        <button onClick={() => onDelete(audioFile.id)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()} className="p-2 bg-lime-500 rounded-full text-slate-900 hover:bg-lime-400 shadow-lg shadow-lime-900/20 flex-shrink-0">
          {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono leading-none">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
          </div>
          <input type="range" min="0" max={duration || 100} step="0.1" value={progress} onChange={(e) => audioRef.current.currentTime = Number(e.target.value)} className="w-full h-1.5 accent-lime-500 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <Volume2 size={14} className="text-slate-400 flex-shrink-0" />
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { audioRef.current.volume = Number(e.target.value); setVolume(Number(e.target.value)); }} className="w-full h-1.5 accent-lime-500 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
      </div>
    </div>
  );
};

// --- COMPONENTE PARA CONTROLES DE VIDEOS ---
const VideoControls = ({ videoObj }) => {
  const [isPlaying, setIsPlaying] = useState(!videoObj.paused);
  const [progress, setProgress] = useState(videoObj.currentTime);
  const [duration, setDuration] = useState(videoObj.duration || 0);
  const [volume, setVolume] = useState(videoObj.muted ? 0 : videoObj.volume);

  useEffect(() => {
    const updateTime = () => setProgress(videoObj.currentTime);
    const updatePlayState = () => setIsPlaying(!videoObj.paused);
    const updateDuration = () => setDuration(videoObj.duration);
    
    videoObj.addEventListener('timeupdate', updateTime);
    videoObj.addEventListener('play', updatePlayState);
    videoObj.addEventListener('pause', updatePlayState);
    videoObj.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      videoObj.removeEventListener('timeupdate', updateTime);
      videoObj.removeEventListener('play', updatePlayState);
      videoObj.removeEventListener('pause', updatePlayState);
      videoObj.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [videoObj]);

  const formatTime = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 space-y-3">
      <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Controles del Video</p>
      <div className="flex justify-center gap-3">
          <button onClick={() => videoObj.currentTime = Math.max(0, videoObj.currentTime - 5)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 border border-slate-700"><Rewind size={16}/></button>
          <button onClick={() => videoObj.paused ? videoObj.play() : videoObj.pause()} className="p-2 bg-lime-500 hover:bg-lime-400 rounded-full text-slate-900 shadow-lg shadow-lime-900/20">
            {isPlaying ? <Pause size={16} className="fill-current"/> : <Play size={16} className="fill-current"/>}
          </button>
          <button onClick={() => { videoObj.pause(); videoObj.currentTime = 0; }} className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-full text-red-400 border border-red-500/20"><StopCircle size={16}/></button>
          <button onClick={() => videoObj.currentTime = Math.min(videoObj.duration, videoObj.currentTime + 5)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 border border-slate-700"><FastForward size={16}/></button>
      </div>
      <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
          </div>
          <input type="range" min="0" max={duration || 100} step="0.1" value={progress} onChange={(e) => videoObj.currentTime = Number(e.target.value)} className="w-full h-1.5 accent-lime-500 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div className="flex items-center gap-3">
          <Volume2 size={16} className="text-slate-400 flex-shrink-0" />
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { videoObj.muted = false; videoObj.volume = Number(e.target.value); setVolume(Number(e.target.value)); }} className="w-full h-1.5 accent-lime-500 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourcesMap = useRef(new Map());
  const recordedChunksRef = useRef([]);

  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [canvasFormat, setCanvasFormat] = useState('horizontal');
  const [currentScene, setCurrentScene] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoInfo, setRecordedVideoInfo] = useState(null);
  const [elements, setElements] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  const elementsRef = useRef(elements);
  const audioFilesRef = useRef(audioFiles);
  const currentSceneRef = useRef(currentScene);
  const canvasFormatRef = useRef(canvasFormat);
  const selectedIdRef = useRef(selectedId);
  const isRecordingRef = useRef(isRecording);
  const interactState = useRef({ action: null, elementId: null, startX: 0, startY: 0, startW: 0, startH: 0, origX: 0, origY: 0 });

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { currentSceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { canvasFormatRef.current = canvasFormat; }, [canvasFormat]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const getDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevs = devices.filter(d => d.kind === 'videoinput');
      const aDevs = devices.filter(d => d.kind === 'audioinput');
      
      setVideoDevices(vDevs);
      setAudioDevices(aDevs);
      
      if (vDevs.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(vDevs[0].deviceId);
      if (aDevs.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(aDevs[0].deviceId);
    } catch (err) { console.error("Error obteniendo dispositivos:", err); }
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

  const switchScene = useCallback((newScene) => {
    setCurrentScene(prev => {
      if (prev === newScene) return prev;
      setElements(els => els.map(el => {
        if (el.type === 'video' && el.videoObj) {
          const wasVisible = el.scene === prev || el.scene === 'todas';
          const isVisible = el.scene === newScene || el.scene === 'todas';
          if (wasVisible && !isVisible) { 
             if (!el.videoObj.paused) { el.wasPlaying = true; el.videoObj.pause(); } 
          } else if (!wasVisible && isVisible && el.wasPlaying) { 
             el.videoObj.play().catch(console.error); el.wasPlaying = false; 
          }
        }
        return el;
      }));
      setSelectedId(null);
      return newScene;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e) => { 
      if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) { 
        e.preventDefault(); switchScene(e.key); 
      } 
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [switchScene]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const format = canvasFormatRef.current;
    const scene = currentSceneRef.current;
    const selId = selectedIdRef.current;
    const recording = isRecordingRef.current;

    elementsRef.current.forEach(el => {
      if (el.scene !== scene && el.scene !== 'todas') return;
      const layout = el.layouts[format];
      if (!layout) return;

      ctx.save();
      // Dibujar elementos
      if (el.type === 'camera' && videoRef.current?.readyState >= 2) {
        if (el.mirror) { 
          ctx.translate(layout.x + layout.w, layout.y); 
          ctx.scale(-1, 1); 
          ctx.drawImage(videoRef.current, 0, 0, layout.w, layout.h); 
        } else {
          ctx.drawImage(videoRef.current, layout.x, layout.y, layout.w, layout.h);
        }
      } else if (el.type === 'image' && el.imageObj) {
        ctx.drawImage(el.imageObj, layout.x, layout.y, layout.w, layout.h);
      } else if (el.type === 'presentation' && el.images && el.images[el.currentIndex]) {
        ctx.drawImage(el.images[el.currentIndex], layout.x, layout.y, layout.w, layout.h);
      } else if (el.type === 'video' && el.videoObj?.readyState >= 2) {
        ctx.drawImage(el.videoObj, layout.x, layout.y, layout.w, layout.h);
      }
      ctx.restore();

      // Indicador de selección
      if (el.id === selId && !recording) {
        ctx.strokeStyle = '#a3e635'; ctx.lineWidth = 4;
        ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);
        ctx.beginPath(); 
        ctx.arc(layout.x + layout.w, layout.y + layout.h, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#a3e635'; ctx.fill(); 
        ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    });
    
    requestAnimationFrame(draw);
  }, []);

  useEffect(() => { 
    const anim = requestAnimationFrame(draw); 
    return () => cancelAnimationFrame(anim); 
  }, [draw]);

  // --- INTERACCIÓN CON EL LIENZO ---
  const getMousePos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getMousePos(e);
    let found = false;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.scene !== currentScene && el.scene !== 'todas') continue;
      const layout = el.layouts[canvasFormat];
      if (!layout) continue;

      const isResize = x >= layout.x + layout.w - 30 && x <= layout.x + layout.w + 30 && y >= layout.y + layout.h - 30 && y <= layout.y + layout.h + 30;
      const isInside = x >= layout.x && x <= layout.x + layout.w && y >= layout.y && y <= layout.y + layout.h;
      
      if (el.id === selectedId && isResize) {
        interactState.current = { action: 'resize', elementId: el.id, startX: x, startY: y, startW: layout.w, startH: layout.h, origX: layout.x, origY: layout.y };
        found = true; break;
      } else if (isInside) {
        setSelectedId(el.id);
        interactState.current = { action: 'drag', elementId: el.id, startX: x, startY: y, startW: layout.w, startH: layout.h, origX: layout.x, origY: layout.y };
        found = true; break;
      }
    }
    if (!found) setSelectedId(null);
  };

  const handlePointerMove = (e) => {
    const state = interactState.current;
    if (!state.action) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getMousePos(e);
    
    setElements(prev => prev.map(el => {
      if (el.id !== state.elementId) return el;
      const layout = { ...el.layouts[canvasFormat] };
      
      if (state.action === 'drag') { 
        layout.x = state.origX + (x - state.startX); 
        layout.y = state.origY + (y - state.startY); 
      } else if (state.action === 'resize') { 
        const aspect = state.startW / state.startH; 
        layout.w = Math.max(50, state.startW + (x - state.startX)); 
        layout.h = layout.w / aspect; 
      }
      return { ...el, layouts: { ...el.layouts, [canvasFormat]: layout } };
    }));
  };

  const handlePointerUp = () => { interactState.current.action = null; };

  // --- FUNCIONES DE MEDIOS ---
  const toggleCamera = async () => {
    if (isVideoOn) {
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
      setElements(prev => prev.filter(e => e.type !== 'camera'));
      setIsVideoOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        videoStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          const aspect = videoRef.current.videoWidth / videoRef.current.videoHeight;
          const h = 360, w = h * aspect;
          setElements(prev => [...prev.filter(e => e.type !== 'camera'), { 
            id: 'cam_1', type: 'camera', scene: 'todas', mirror: true, 
            layouts: { horizontal: { x: (1280 - w)/2, y: (720 - h)/2, w, h }, vertical: { x: (720 - w)/2, y: (1280 - h)/2, w, h } } 
          }]);
          setSelectedId('cam_1');
        };
        setIsVideoOn(true);
      } catch (err) { console.error("Error cámara:", err); }
    }
  };

  const toggleMic = async () => {
    if (isMicOn) { 
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop()); 
      setIsMicOn(false); 
    } else {
      try { 
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true } 
        }); 
        audioStreamRef.current = stream; 
        setIsMicOn(true); 
      } catch (err) { console.error("Error micrófono:", err); }
    }
  };

  const addFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `el_${Date.now()}`;
    
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video'); 
      vid.src = url; vid.muted = false; vid.loop = true;
      vid.onloadedmetadata = () => {
        const aspect = vid.videoWidth / vid.videoHeight, h = 300, w = h * aspect;
        setElements(prev => [...prev, { id, type: 'video', scene: currentScene, videoObj: vid, layouts: { horizontal: { x: 100, y: 100, w, h }, vertical: { x: 100, y: 100, w, h } } }]);
        setSelectedId(id);
      };
    } else if (file.type.startsWith('image/')) {
      const img = new Image(); img.src = url;
      img.onload = () => {
        const aspect = img.width / img.height, h = 300, w = h * aspect;
        setElements(prev => [...prev, { id, type: 'image', scene: currentScene, imageObj: img, layouts: { horizontal: { x: 100, y: 100, w, h }, vertical: { x: 100, y: 100, w, h } } }]);
        setSelectedId(id);
      };
    } else if (file.type.startsWith('audio/')) {
      setAudioFiles(prev => [...prev, { id, url, name: file.name }]);
    }
    e.target.value = null;
  };

  const addPresentation = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const id = `slide_${Date.now()}`;
    const images = [];
    let loaded = 0;
    
    files.forEach((f, i) => {
      const img = new Image(); img.src = URL.createObjectURL(f);
      img.onload = () => {
        images[i] = img; loaded++;
        if (loaded === files.length) {
          const aspect = images[0].width / images[0].height, h = 360, w = h * aspect;
          setElements(prev => [...prev, { id, type: 'presentation', scene: currentScene, images, currentIndex: 0, layouts: { horizontal: { x: 100, y: 100, w, h }, vertical: { x: 100, y: 100, w, h } } }]);
          setSelectedId(id);
        }
      };
    });
    e.target.value = null;
  };

  // --- GRABACIÓN Y AUDIO MIXING ---
  const startRecording = async () => {
    recordedChunksRef.current = [];
    const canvasStream = canvasRef.current.captureStream(60);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const dest = audioCtx.createMediaStreamDestination();

    // Sumar el micrófono a la mezcla general
    if (audioStreamRef.current) {
      audioCtx.createMediaStreamSource(audioStreamRef.current).connect(dest);
    }
    
    // Sumar los videos del lienzo a la mezcla general
    elementsRef.current.forEach(el => {
      if (el.type === 'video' && el.videoObj) {
        if (!audioSourcesMap.current.has(el.videoObj)) {
          const source = audioCtx.createMediaElementSource(el.videoObj);
          audioSourcesMap.current.set(el.videoObj, source);
          source.connect(dest); 
          source.connect(audioCtx.destination);
        }
      }
    });

    // Sumar las pistas de audio a la mezcla general
    audioFilesRef.current.forEach(af => {
      const aEl = document.getElementById(af.id);
      if (aEl && !audioSourcesMap.current.has(aEl)) {
        const source = audioCtx.createMediaElementSource(aEl);
        audioSourcesMap.current.set(aEl, source);
        source.connect(dest); 
        source.connect(audioCtx.destination);
      }
    });

    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    
    // Forzar el formato MP4 si el navegador lo permite
    let mime = 'video/mp4;codecs=avc1,aac';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp9,opus';
    
    mediaRecorderRef.current = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: 320000 });
    
    mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mime.split(';')[0] });
      setRecordedVideoInfo({ url: URL.createObjectURL(blob), ext: mime.includes('mp4') ? 'mp4' : 'webm' });
    };
    
    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-6 h-6 text-lime-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-lime-400 to-green-500 bg-clip-text text-transparent uppercase tracking-tighter">Estudio ELPZN</h1>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 font-bold animate-pulse">
            GRABANDO {Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}
          </div>
        )}
      </header>

      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 max-w-[1800px] mx-auto w-full overflow-hidden">
        {/* Panel Izquierdo: Fuentes */}
        <div className="w-full xl:w-72 flex flex-col gap-4">
          <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Fuentes de Medios</h2>
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <button onClick={toggleCamera} className={`w-full py-2.5 rounded-lg font-bold border transition-all flex justify-center items-center gap-2 ${isVideoOn ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}>
                  {isVideoOn ? <VideoOff size={18} /> : <Video size={18} />}
                  {isVideoOn ? 'Apagar Cámara' : 'Cámara'}
                </button>
                {videoDevices.length > 0 && (
                  <select value={selectedVideoDevice} onChange={(e) => setSelectedVideoDevice(e.target.value)} className="w-full bg-slate-950 text-[10px] p-2 rounded border border-slate-800 outline-none text-slate-300">
                    {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Cámara del sistema'}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <button onClick={toggleMic} className={`w-full py-2.5 rounded-lg font-bold border transition-all flex items-center justify-center gap-2 ${isMicOn ? 'bg-slate-800 border-lime-500/30 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.1)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                   {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                   {isMicOn ? 'Mic Activo' : 'Mic Pausado'}
                   <div className={`w-2.5 h-2.5 rounded-full ${isMicOn ? 'bg-lime-500 shadow-[0_0_8px_#84cc16]' : 'bg-red-500'}`}></div>
                </button>
                {audioDevices.length > 0 && (
                  <select value={selectedAudioDevice} onChange={(e) => setSelectedAudioDevice(e.target.value)} className="w-full bg-slate-950 text-[10px] p-2 rounded border border-slate-800 outline-none text-slate-300">
                    {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Micrófono del sistema'}</option>)}
                  </select>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 border border-slate-700 rounded-lg font-bold cursor-pointer hover:bg-slate-700 transition-colors">
                <Upload size={18}/> Medios Libres
                <input type="file" onChange={addFile} className="hidden" accept="image/*,video/*,audio/*" />
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 border border-lime-500/20 text-lime-400 rounded-lg font-bold cursor-pointer hover:bg-slate-700 transition-colors">
                <Presentation size={18}/> Presentación
                <input type="file" multiple onChange={addPresentation} className="hidden" accept="image/*" />
              </label>
            </div>
          </section>

          <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg mt-auto">
            {!isRecording ? (
              <button onClick={startRecording} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all flex justify-center items-center gap-2">
                <Play size={20} className="fill-current" /> Iniciar Grabación
              </button>
            ) : (
              <button onClick={() => { mediaRecorderRef.current.stop(); setIsRecording(false); }} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 animate-pulse transition-all flex justify-center items-center gap-2">
                <StopCircle size={20} /> Detener Grabación
              </button>
            )}
          </section>
        </div>

        {/* Área Central: Lienzo */}
        <div className="flex-1 flex flex-col gap-4 items-center min-w-0">
          <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-md">
            {['1', '2', '3', '4'].map(n => (
              <button key={n} onClick={() => switchScene(n)} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${currentScene === n ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:bg-slate-800'}`}>ESCENA {n}</button>
            ))}
          </div>

          <div className={`relative bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl touch-none ${canvasFormat === 'horizontal' ? 'w-full aspect-video max-w-5xl' : 'h-[75vh] aspect-[9/16]'}`}>
            <canvas 
              ref={canvasRef} 
              width={canvasFormat === 'horizontal' ? 1280 : 720} 
              height={canvasFormat === 'horizontal' ? 720 : 1280} 
              className="w-full h-full cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <video ref={videoRef} className="hidden" playsInline muted />
          </div>

          {recordedVideoInfo && (
            <div className="flex gap-3 p-3 bg-slate-900 rounded-full border border-slate-800 shadow-xl items-center animate-in zoom-in duration-300">
              <a href={recordedVideoInfo.url} download={`estudio_elpzn.${recordedVideoInfo.ext}`} className="flex items-center gap-2 px-6 py-2.5 bg-lime-500 text-slate-900 rounded-full font-bold hover:bg-lime-400 transition-all shadow-md">
                <Download size={20}/> Descargar {recordedVideoInfo.ext.toUpperCase()}
              </a>
              <div className="w-px h-8 bg-slate-700 mx-1"></div>
              <button onClick={() => setRecordedVideoInfo(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-full font-semibold border border-slate-700 hover:bg-slate-700 transition-all">
                <RotateCcw size={18}/> Volver a grabar
              </button>
              <button onClick={() => setRecordedVideoInfo(null)} className="p-2.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-all border border-red-500/20">
                <Trash2 size={20}/>
              </button>
            </div>
          )}
        </div>

        {/* Panel Derecho: Propiedades */}
        <div className="w-full xl:w-80 flex flex-col gap-4">
          <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg flex-1 overflow-y-auto custom-scrollbar">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Propiedades Visuales</h2>
            {selectedId ? (
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 space-y-2">
                   <p className="text-[10px] text-slate-400 uppercase font-bold">Mostrar en escena:</p>
                   <select value={selectedElement?.scene || 'todas'} onChange={(e) => setElements(prev => prev.map(el => el.id === selectedId ? {...el, scene: e.target.value} : el))} className="w-full bg-slate-950 p-2 rounded border border-slate-800 outline-none text-sm text-slate-200 transition-colors focus:border-lime-500/50">
                      <option value="1">Solo Escena 1</option><option value="2">Solo Escena 2</option><option value="3">Solo Escena 3</option><option value="4">Solo Escena 4</option><option value="todas">Todas las Escenas</option>
                   </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setElements(p => { const i = p.findIndex(e=>e.id===selectedId); if(i>0) { const n=[...p]; [n[i-1],n[i]]=[n[i],n[i-1]]; return n; } return p; })} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-all"><ArrowDown size={14}/> Bajar Capa</button>
                    <button onClick={() => setElements(p => { const i = p.findIndex(e=>e.id===selectedId); if(i<p.length-1) { const n=[...p]; [n[i+1],n[i]]=[n[i],n[i+1]]; return n; } return p; })} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-all"><ArrowUp size={14}/> Subir Capa</button>
                </div>
                {selectedElement?.type === 'camera' && (
                  <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, mirror: !el.mirror} : el))} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-700 text-slate-300 flex items-center justify-center gap-2 transition-all">
                    <FlipHorizontal size={14}/> Alternar Modo Espejo
                  </button>
                )}
                {selectedElement?.type === 'video' && <VideoControls videoObj={selectedElement.videoObj} />}
                {selectedElement?.type === 'presentation' && (
                   <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 space-y-3">
                      <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Diapositivas</p>
                      <div className="flex justify-between items-center">
                         <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, currentIndex: Math.max(0, el.currentIndex - 1)} : el))} className="p-2 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft size={16}/></button>
                         <span className="text-xs font-mono text-lime-400 font-bold">{selectedElement.currentIndex + 1} / {selectedElement.images.length}</span>
                         <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, currentIndex: Math.min(el.images.length - 1, el.currentIndex + 1)} : el))} className="p-2 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronRight size={16}/></button>
                      </div>
                   </div>
                )}
                <button onClick={() => { if(selectedElement?.type==='video') selectedElement.videoObj.pause(); setElements(p => p.filter(e => e.id !== selectedId)); setSelectedId(null); }} className="w-full py-2.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 font-bold text-xs uppercase transition-colors mt-2">Eliminar elemento</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-3">
                <LayoutTemplate size={40} strokeWidth={1}/><p className="text-xs italic">Seleccione un elemento visual</p>
              </div>
            )}
          </section>

          {audioFiles.length > 0 && (
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg max-h-96 overflow-y-auto custom-scrollbar">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Pistas de Audio</h2>
              <div className="flex flex-col gap-3">
                {audioFiles.map(af => <CustomAudioPlayer key={af.id} audioFile={af} onDelete={(id) => setAudioFiles(p => p.filter(a => a.id !== id))} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
