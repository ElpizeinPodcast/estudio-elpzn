import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, StopCircle, Play, Image as ImageIcon, Trash2, Download, Mic, MicOff, MonitorPlay, Video, VideoOff, Upload, LayoutTemplate, Smartphone, Pause, FastForward, Rewind, ArrowUp, ArrowDown, Volume2, Music, FlipHorizontal, ChevronLeft, ChevronRight, RotateCcw, Presentation } from 'lucide-react';

// --- REPRODUCTOR DE PISTAS DE AUDIO ---
const CustomAudioPlayer = ({ audioFile, onDelete, onAttachBus }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const aud = audioRef.current;
    if (!aud) return;
    
    // Conectar al bus maestro de grabación al iniciar
    if (onAttachBus) onAttachBus(aud);

    const updateTime = () => setProgress(aud.currentTime);
    const updateDuration = () => setDuration(aud.duration);
    const updatePlayState = () => setIsPlaying(!aud.paused);

    aud.addEventListener('timeupdate', updateTime);
    aud.addEventListener('loadedmetadata', updateDuration);
    aud.addEventListener('play', updatePlayState);
    aud.addEventListener('pause', updatePlayState);

    if (aud.readyState >= 1) setDuration(aud.duration);
    setVolume(aud.volume);

    return () => {
      aud.removeEventListener('timeupdate', updateTime);
      aud.removeEventListener('loadedmetadata', updateDuration);
      aud.removeEventListener('play', updatePlayState);
      aud.removeEventListener('pause', updatePlayState);
    };
  }, [onAttachBus]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-gray-800 p-3.5 rounded-lg border border-gray-700 shadow-inner flex flex-col gap-3">
      <audio id={audioFile.id} ref={audioRef} src={audioFile.url} loop className="hidden" />
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p className="text-xs text-gray-200 font-medium truncate" title={audioFile.name}>{audioFile.name}</p>
        </div>
        <button onClick={() => onDelete(audioFile.id)} className="text-gray-500 hover:text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()} className="p-2 bg-lime-500 hover:bg-lime-400 rounded-full text-gray-900 shadow-md">
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <input type="range" min="0" max={duration || 0} step="0.1" value={progress} onChange={(e) => { audioRef.current.currentTime = Number(e.target.value); }} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500" />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono leading-none">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Volume2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input type="range" min="0" max="2" step="0.05" value={volume} onChange={(e) => {
            const vol = Number(e.target.value);
            try { audioRef.current.volume = Math.min(vol, 1); } catch(err){}
            setVolume(vol);
            if (audioRef.current.recordGainNode) audioRef.current.recordGainNode.gain.value = vol;
          }} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500" />
        <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
};

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Referencias para el Bus Maestro de Audio
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);
  const audioSourcesMap = useRef(new Map());
  const micSourceRef = useRef(null);

  const micBarRef = useRef(null);
  const micAnimRef = useRef(null);

  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [canvasFormat, setCanvasFormat] = useState('horizontal');
  const [currentScene, setCurrentScene] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedVideoInfo, setRecordedVideoInfo] = useState(null);
  const [elements, setElements] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Estados de control para video seleccionado
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0);

  // Dispositivos
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  // Refs de estado para el ciclo de renderizado (optimización extrema)
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

  // Sincronizar Refs
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { canvasFormatRef.current = canvasFormat; }, [canvasFormat]);
  useEffect(() => { currentSceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // --- BUS MAESTRO DE AUDIO ---
  // Esta función garantiza que todo sonido pase por nuestra "consola central"
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        destRef.current = audioCtxRef.current.createMediaStreamDestination();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
  }, []);

  const attachAudioToBus = useCallback((mediaEl) => {
    ensureAudioCtx();
    const ctx = audioCtxRef.current;
    let source = audioSourcesMap.current.get(mediaEl);
    if (!source) {
        source = ctx.createMediaElementSource(mediaEl);
        audioSourcesMap.current.set(mediaEl, source);
        const gainNode = ctx.createGain();
        gainNode.gain.value = mediaEl.muted ? 0 : mediaEl.volume;
        mediaEl.recordGainNode = gainNode;
        source.connect(gainNode);
        gainNode.connect(destRef.current); // Envia al archivo de grabación
        gainNode.connect(ctx.destination); // Envia a los parlantes
    }
  }, [ensureAudioCtx]);


  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter(d => d.kind === 'videoinput');
        const aDevs = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(vDevs); setAudioDevices(aDevs);
        setSelectedVideoDevice(prev => prev || (vDevs.length > 0 ? vDevs[0].deviceId : ''));
        setSelectedAudioDevice(prev => prev || (aDevs.length > 0 ? aDevs[0].deviceId : ''));
      } catch (err) { console.error("Error dispositivos:", err); }
    };
    getDevices();
    navigator.mediaDevices?.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', getDevices);
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    else if (!isRecording) setRecordingTime(0);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  useEffect(() => {
    const el = elements.find(e => e.id === selectedId);
    if (el && el.type === 'video' && el.videoObj) {
      const mediaObj = el.videoObj;
      setVideoDuration(mediaObj.duration || 0);
      setVideoProgress(mediaObj.currentTime || 0);
      setVideoVolume(mediaObj.muted ? 0 : mediaObj.volume);

      const handleTimeUpdate = () => setVideoProgress(mediaObj.currentTime);
      const handleDurationChange = () => setVideoDuration(mediaObj.duration);
      
      mediaObj.addEventListener('timeupdate', handleTimeUpdate);
      mediaObj.addEventListener('durationchange', handleDurationChange);
      return () => {
        mediaObj.removeEventListener('timeupdate', handleTimeUpdate);
        mediaObj.removeEventListener('durationchange', handleDurationChange);
      };
    }
  }, [selectedId, elements]);

  const switchScene = useCallback((newScene) => {
    setCurrentScene(prev => {
      if (prev === newScene) return prev;
      setElements(els => els.map(el => {
        if (el.type === 'video' && el.videoObj) {
          const wasVisible = el.scene === prev || el.scene === 'todas';
          const isVisible = el.scene === newScene || el.scene === 'todas';
          if (wasVisible && !isVisible) { if (!el.videoObj.paused) { el.wasPlaying = true; el.videoObj.pause(); } }
          else if (!wasVisible && isVisible && el.wasPlaying) { el.videoObj.play().catch(console.error); el.wasPlaying = false; }
        }
        return el;
      }));
      setSelectedId(null);
      return newScene;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); switchScene(e.key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchScene]);

  // --- CICLO DE DIBUJO (CANVAS) OPTIMIZADO ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Suavizado estandar para videos fluidos sin sobrecargar la CPU
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const format = canvasFormatRef.current;
    const curScene = currentSceneRef.current;
    const currentSelectedId = selectedIdRef.current;

    elementsRef.current.forEach(el => {
      if (el.scene !== curScene && el.scene !== 'todas') return;
      const layout = el.layouts[format];
      if (!layout) return;

      ctx.save();
      if (el.type === 'camera' && videoRef.current && videoRef.current.readyState >= 2) {
        // CÁMARA NATURAL: Sin filtros para evitar tirones
        if (el.mirror !== false) {
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
      } else if (el.type === 'video' && el.videoObj && el.videoObj.readyState >= 2) {
        if (el.videoObj.paused) {
          ctx.fillStyle = '#000000'; ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
        } else {
          ctx.drawImage(el.videoObj, layout.x, layout.y, layout.w, layout.h);
        }
      }
      ctx.restore();

      // DIBUJAR 4 ESQUINAS DE SELECCIÓN
      if (el.id === currentSelectedId && !isRecordingRef.current) {
        ctx.strokeStyle = '#a3e635'; 
        ctx.lineWidth = 3;
        ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);

        const corners = [
          { cx: layout.x, cy: layout.y, id: 'tl' },
          { cx: layout.x + layout.w, cy: layout.y, id: 'tr' },
          { cx: layout.x, cy: layout.y + layout.h, id: 'bl' },
          { cx: layout.x + layout.w, cy: layout.y + layout.h, id: 'br' }
        ];

        ctx.fillStyle = '#a3e635';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        corners.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.cx, c.cy, 8, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        });
      }
    });

    animationFrameRef.current = requestAnimationFrame(drawCanvas);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [drawCanvas]);

  // --- INTERACCIÓN FLUIDA CON EL MOUSE (BYPASS REACT STATE) ---
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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
    const format = canvasFormatRef.current;

    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      const layout = el.layouts[format];
      if (!layout || (el.scene !== currentSceneRef.current && el.scene !== 'todas')) continue;
      
      const isInside = x >= layout.x && x <= layout.x + layout.w && y >= layout.y && y <= layout.y + layout.h;
      
      let cornerHit = null;
      if (el.id === selectedIdRef.current) {
         const hitZone = 20;
         if (Math.abs(x - layout.x) <= hitZone && Math.abs(y - layout.y) <= hitZone) cornerHit = 'resize-tl';
         else if (Math.abs(x - (layout.x + layout.w)) <= hitZone && Math.abs(y - layout.y) <= hitZone) cornerHit = 'resize-tr';
         else if (Math.abs(x - layout.x) <= hitZone && Math.abs(y - (layout.y + layout.h)) <= hitZone) cornerHit = 'resize-bl';
         else if (Math.abs(x - (layout.x + layout.w)) <= hitZone && Math.abs(y - (layout.y + layout.h)) <= hitZone) cornerHit = 'resize-br';
      }

      if (cornerHit) {
        interactState.current = { action: cornerHit, elementId: el.id, startX: x, startY: y, startElemX: layout.x, startElemY: layout.y, startElemW: layout.w, startElemH: layout.h };
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
    if (e.cancelable) e.preventDefault();
    
    const { x, y } = getMousePos(e);
    const format = canvasFormatRef.current;
    
    const elIndex = elementsRef.current.findIndex(el => el.id === state.elementId);
    if (elIndex === -1) return;
    
    const el = elementsRef.current[elIndex];
    const layout = { ...el.layouts[format] };
    const aspect = state.startElemW / state.startElemH;

    if (state.action === 'drag') {
      layout.x = state.startElemX + (x - state.startX);
      layout.y = state.startElemY + (y - state.startY);
    } else if (state.action.startsWith('resize')) {
      let deltaX = x - state.startX;
      let newW = state.startElemW;

      if (state.action === 'resize-br' || state.action === 'resize-tr') newW += deltaX;
      else if (state.action === 'resize-tl' || state.action === 'resize-bl') newW -= deltaX;

      newW = Math.max(50, newW);
      let newH = newW / aspect;

      // Compensar la X o la Y dependiendo de la esquina
      if (state.action === 'resize-tl') {
          layout.x = state.startElemX + (state.startElemW - newW);
          layout.y = state.startElemY + (state.startElemH - newH);
      } else if (state.action === 'resize-tr') {
          layout.y = state.startElemY + (state.startElemH - newH);
      } else if (state.action === 'resize-bl') {
          layout.x = state.startElemX + (state.startElemW - newW);
      }
      layout.w = newW;
      layout.h = newH;
    }

    // Muta directamente la referencia para fluidez a 60FPS sin esperar a React
    elementsRef.current[elIndex].layouts[format] = layout;
  };

  const handlePointerUp = () => { 
    if (interactState.current.action) {
      setElements([...elementsRef.current]);
      interactState.current = { action: null }; 
    }
  };

  // --- FUNCIONES DE CÁMARA Y AUDIO ---
  const toggleVideo = async () => {
    if (isVideoOn) {
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setElements(prev => prev.filter(el => el.type !== 'camera'));
      setIsVideoOn(false);
    } else {
      try {
        // Reducimos la exigencia de la cámara a 1280x720 (720p) a 30 FPS para equipos de bajos recursos (Similar a OBS)
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        });
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
                id: 'cam_1', type: 'camera', scene: 'todas', mirror: true,
                layouts: { horizontal: { x: (1280 - w)/2, y: (720 - h)/2, w, h }, vertical: { x: (720 - w)/2, y: (1280 - h)/2, w, h } }
              }
            ]);
            setSelectedId('cam_1');
          };
        }
        setIsVideoOn(true);
      } catch (err) { console.error("Error cámara:", err); }
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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true }
        });
        audioStreamRef.current = stream;
        setIsMicOn(true);

        ensureAudioCtx();
        const ctx = audioCtxRef.current;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        micSourceRef.current = ctx.createMediaStreamSource(stream);
        micSourceRef.current.connect(analyser);
        // Conectar micrófono al bus maestro de grabación inmediatamente
        micSourceRef.current.connect(destRef.current);

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
      } catch (err) { console.error("Error micrófono:", err); }
    }
  };

  const addMediaElement = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newId = `med_${Date.now()}`;

    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = url; vid.muted = false; vid.loop = true;
      vid.onloadedmetadata = () => {
        attachAudioToBus(vid);
        const aspect = vid.videoWidth / vid.videoHeight;
        // Ajuste seguro para evitar desbordamientos en lienzos
        let wH = 600; let hH = wH / aspect; if (hH > 500) { hH = 500; wH = hH * aspect; }
        let wV = 500; let hV = wV / aspect; if (hV > 800) { hV = 800; wV = hV * aspect; }
        
        setElements(prev => [...prev, { id: newId, type: 'video', scene: currentScene, videoObj: vid, layouts: { horizontal: { x: (1280 - wH)/2, y: (720 - hH)/2, w: wH, h: hH }, vertical: { x: (720 - wV)/2, y: (1280 - hV)/2, w: wV, h: hV } } }]);
        setSelectedId(newId);
      };
    } else if (file.type.startsWith('audio/')) {
      setAudioFiles(prev => [...prev, { id: `aud_${Date.now()}`, url: url, name: file.name }]);
    } else {
      const img = new Image(); img.src = url;
      img.onload = () => {
        const aspect = img.width / img.height;
        let wH = 600; let hH = wH / aspect; if (hH > 500) { hH = 500; wH = hH * aspect; }
        let wV = 500; let hV = wV / aspect; if (hV > 800) { hV = 800; wV = hV * aspect; }
        
        setElements(prev => [...prev, { id: newId, type: 'image', scene: currentScene, imageObj: img, layouts: { horizontal: { x: (1280 - wH)/2, y: (720 - hH)/2, w: wH, h: hH }, vertical: { x: (720 - wV)/2, y: (1280 - hV)/2, w: wV, h: hV } } }]);
        setSelectedId(newId);
      };
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
          const firstImg = images.find(img => img !== undefined);
          const aspect = firstImg ? (firstImg.width / firstImg.height) : 1;
          
          // Cálculo estricto para que la presentación no se salga del lienzo ni horizontal ni vertical
          let wH = 1000; let hH = wH / aspect;
          if (hH > 600) { hH = 600; wH = hH * aspect; }
          
          let wV = 650; let hV = wV / aspect;
          if (hV > 1100) { hV = 1100; wV = hV * aspect; }
          
          setElements(prev => [...prev, { id, type: 'presentation', scene: currentScene, images, currentIndex: 0, layouts: { horizontal: { x: (1280 - wH)/2, y: (720 - hH)/2, w: wH, h: hH }, vertical: { x: (720 - wV)/2, y: (1280 - hV)/2, w: wV, h: hV } } }]);
          setSelectedId(id);
        }
      };
    });
    e.target.value = null;
  };

  // --- GRABACIÓN MAESTRA ---
  const startRecording = () => {
    if (!canvasRef.current) return;
    ensureAudioCtx(); // Garantizar que el bus de audio esté encendido
    recordedChunksRef.current = [];
    
    // Bajamos la exigencia de FPS a 30 (como configurado en OBS) para que sea ligero
    const canvasStream = canvasRef.current.captureStream(30);
    // Unimos el video con nuestro Destino de Audio Maestro (Bus Central)
    const combinedStream = new MediaStream([ ...canvasStream.getVideoTracks(), ...destRef.current.stream.getAudioTracks() ]);
    
    // Forzar MP4 de alta calidad y estable
    let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    let ext = 'mp4';
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
           mimeType = 'video/webm;codecs=h264';
           if (!MediaRecorder.isTypeSupported(mimeType)) {
               mimeType = 'video/webm;codecs=vp9,opus';
               ext = 'webm';
           }
        }
    }

    mediaRecorderRef.current = new MediaRecorder(combinedStream, { 
      mimeType: mimeType, 
      videoBitsPerSecond: 2500000, // 2500 Kbps (Bitrate de video de OBS)
      audioBitsPerSecond: 160000   // 160 Kbps (Bitrate de audio de OBS)
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      // Al detener, ensamblamos todo el video de una sola vez para que el MP4 quede perfecto
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedVideoInfo({ url, extension: ext });
    };

    // INICIO DE GRABACIÓN DE CORRIDO (Sin cortes por milisegundos)
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

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
        {isRecording && (
          <div className={`flex items-center gap-2 px-3 py-1 border rounded-full font-medium ${isPaused ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse'}`}>
            {isPaused ? 'Pausado' : 'Grabando'}
            <span className="text-lime-400 font-mono font-bold ml-1">{formatTimeUI(recordingTime)}</span>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 max-w-[1800px] mx-auto w-full">
        <div className="w-full xl:w-72 flex flex-col gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Fuentes</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                  <button onClick={toggleVideo} className={`flex items-center justify-center gap-2 w-full py-2 rounded-md font-medium border transition-colors ${isVideoOn ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'}`}>
                      {isVideoOn ? <VideoOff size={18}/> : <Video size={18}/>} Cámara
                  </button>
                  {videoDevices.length > 0 && (
                      <select value={selectedVideoDevice} onChange={(e) => setSelectedVideoDevice(e.target.value)} className="mt-1 w-full bg-gray-950 text-[10px] p-1.5 rounded border border-gray-800 outline-none text-gray-400">
                          {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Cámara'}</option>)}
                      </select>
                  )}
              </div>
              
              <div className="flex flex-col">
                  <button onClick={toggleMic} className={`flex items-center justify-center gap-2 w-full py-2 rounded-md font-medium border transition-colors ${isMicOn ? 'bg-slate-800 border-lime-500/30 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.1)]' : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'}`}>
                     {isMicOn ? <Mic size={18} /> : <MicOff size={18} />} Micrófono
                  </button>
                  {audioDevices.length > 0 && (
                      <select value={selectedAudioDevice} onChange={(e) => setSelectedAudioDevice(e.target.value)} className="mt-1 w-full bg-gray-950 text-[10px] p-1.5 rounded border border-gray-800 outline-none text-gray-400">
                          {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Micrófono'}</option>)}
                      </select>
                  )}
                  {/* SOLO BARRA VISUAL, SIN BOTONES DE VOLUMEN MANUAL */}
                  <div className="flex flex-col gap-1 w-full mt-2 bg-gray-800/50 p-2 rounded-md border border-gray-700/50">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nivel de Mic</span>
                      </div>
                      <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                          <div ref={micBarRef} className="h-full bg-lime-500 w-0 transition-all duration-75"></div>
                      </div>
                  </div>
              </div>

              <label className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 border border-gray-700 rounded-md font-medium cursor-pointer hover:bg-gray-700 transition-colors mt-2">
                <Upload size={18} /> Subir Medio Libre
                <input type="file" onChange={addMediaElement} className="hidden" accept="image/*,video/*,audio/*" />
              </label>

              <label className="flex items-center justify-center gap-2 w-full py-2 bg-gray-800 border border-lime-500/30 text-lime-400 rounded-md font-medium cursor-pointer hover:bg-gray-700 transition-colors">
                <Presentation size={18} /> Subir Presentación
                <input type="file" multiple onChange={addPresentation} className="hidden" accept="image/*" />
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
              <div className="flex gap-2 w-full">
                  <button onClick={isPaused ? resumeRecording : pauseRecording} className={`flex-1 py-3 ${isPaused ? 'bg-amber-500 hover:bg-amber-400 text-gray-900' : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-500/30'} rounded-md font-semibold transition-colors flex justify-center items-center gap-2`}>
                      {isPaused ? <Play size={18} className="fill-current"/> : <Pause size={18} className="fill-current"/>} 
                  </button>
                  <button onClick={stopRecording} className={`flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold ${!isPaused && 'animate-pulse'} transition-colors flex justify-center items-center gap-2`}>
                      <StopCircle size={18}/> Detener
                  </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 items-center min-w-0">
          <div className="w-full flex justify-between items-center px-2">
             <div className="flex gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
               {[1, 2, 3, 4].map(num => (
                 <button key={num} onClick={() => switchScene(num.toString())} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${currentScene === num.toString() ? 'bg-lime-500 text-gray-900 shadow-md' : 'text-gray-400 hover:bg-gray-800'}`}>Escena {num}</button>
               ))}
             </div>
             <div className="flex gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
                 {/* Botones de formato bloqueados mientras se graba para evitar corrupción */}
                 <button onClick={() => !isRecording && setCanvasFormat('horizontal')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${canvasFormat === 'horizontal' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}>16:9 (Horizontal)</button>
                 <button onClick={() => !isRecording && setCanvasFormat('vertical')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${canvasFormat === 'vertical' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}>9:16 (Vertical)</button>
             </div>
          </div>

          <div className={`relative bg-black rounded-lg overflow-hidden border border-gray-800 touch-none shadow-2xl ${canvasFormat === 'horizontal' ? 'w-full aspect-video max-w-5xl' : 'h-[75vh] aspect-[9/16]'}`}>
            <canvas ref={canvasRef} width={canvasFormat === 'horizontal' ? 1280 : 720} height={canvasFormat === 'horizontal' ? 720 : 1280} className="w-full h-full cursor-move" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
            <video ref={videoRef} className="hidden" />
          </div>

          {recordedVideoInfo && !isRecording && (
            <div className="flex gap-3 mt-2 bg-gray-900 p-2 rounded-full border border-gray-800 animate-in zoom-in duration-300 shadow-lg">
              <a href={recordedVideoInfo.url} download={`grabacion_estudio.${recordedVideoInfo.extension}`} className="px-5 py-2 bg-lime-500 text-slate-900 rounded-full text-sm font-bold shadow-md hover:bg-lime-400 transition-colors flex items-center gap-2">
                  <Download size={16}/> Descargar {recordedVideoInfo.extension.toUpperCase()}
              </a>
              <div className="w-px h-6 bg-gray-700 mx-1 self-center"></div>
              <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm font-medium border border-gray-700 hover:bg-gray-700 transition-colors">
                  <RotateCcw size={16}/> Volver a grabar
              </button>
            </div>
          )}
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg flex-1 overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 tracking-widest">Propiedades</h2>
            {selectedId ? (
              <div className="space-y-4">
                <div className="space-y-2">
                   <p className="text-[10px] text-gray-400 uppercase font-bold text-center">Mostrar en escena:</p>
                   <select value={selectedElement?.scene || 'todas'} onChange={(e) => setElements(prev => prev.map(el => el.id === selectedId ? {...el, scene: e.target.value} : el))} className="w-full bg-gray-800 p-2 rounded border border-gray-700 outline-none text-sm text-gray-200">
                      <option value="1">Escena 1</option><option value="2">Escena 2</option>
                      <option value="3">Escena 3</option><option value="4">Escena 4</option>
                      <option value="todas">Todas</option>
                   </select>
                </div>

                <div className="flex gap-2 mt-4">
                    <button onClick={() => setElements(p => { const i=p.findIndex(e=>e.id===selectedId); if(i>0){const n=[...p];[n[i-1],n[i]]=[n[i],n[i-1]]; return n;} return p; })} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-xs border border-gray-700 text-gray-300 flex items-center justify-center gap-1 transition-colors"><ArrowDown size={14}/> Bajar Capa</button>
                    <button onClick={() => setElements(p => { const i=p.findIndex(e=>e.id===selectedId); if(i<p.length-1){const n=[...p];[n[i+1],n[i]]=[n[i],n[i+1]]; return n;} return p; })} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-xs border border-gray-700 text-gray-300 flex items-center justify-center gap-1 transition-colors"><ArrowUp size={14}/> Subir Capa</button>
                </div>

                {selectedElement?.type === 'camera' && (
                    <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, mirror: !el.mirror} : el))} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs border border-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-colors mt-2">
                        <FlipHorizontal size={14}/> Alternar Espejo
                    </button>
                )}

                {selectedElement?.type === 'presentation' && (
                   <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 space-y-3 mt-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold text-center">Diapositivas</p>
                      <div className="flex justify-between items-center">
                         <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, currentIndex: Math.max(0, el.currentIndex - 1)} : el))} className="p-2.5 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700 transition-colors"><ChevronLeft size={18}/></button>
                         <span className="text-sm font-mono text-lime-400 font-bold bg-gray-900 px-3 py-1 rounded-md">{selectedElement.currentIndex + 1} / {selectedElement.images.length}</span>
                         <button onClick={() => setElements(p => p.map(el => el.id === selectedId ? {...el, currentIndex: Math.min(el.images.length - 1, el.currentIndex + 1)} : el))} className="p-2.5 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700 transition-colors"><ChevronRight size={18}/></button>
                      </div>
                   </div>
                )}

                {selectedElement?.type === 'video' && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 space-y-4 mt-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold text-center">Control Video</p>
                      <div className="flex justify-center gap-3">
                          <button onClick={() => selectedElement.videoObj.currentTime -= 5} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"><Rewind size={16}/></button>
                          <button onClick={() => selectedElement.videoObj.paused ? selectedElement.videoObj.play() : selectedElement.videoObj.pause()} className="p-2 bg-lime-500 hover:bg-lime-400 rounded-full text-slate-900 shadow-lg">
                            {selectedElement.videoObj.paused ? <Play size={16} className="fill-current"/> : <Pause size={16} className="fill-current"/>}
                          </button>
                          <button onClick={() => { selectedElement.videoObj.pause(); selectedElement.videoObj.currentTime = 0; }} className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-full text-red-400 transition-colors"><StopCircle size={16}/></button>
                          <button onClick={() => selectedElement.videoObj.currentTime += 5} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"><FastForward size={16}/></button>
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

                <button onClick={() => { if(selectedElement?.videoObj) selectedElement.videoObj.pause(); setElements(p => p.filter(e => e.id !== selectedId)); setSelectedId(null); }} className="w-full py-2.5 bg-red-600/10 text-red-400 rounded-md border border-red-500/20 hover:bg-red-600/20 mt-4 text-xs font-bold uppercase transition-colors">Eliminar elemento</button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic text-center py-10 flex flex-col items-center gap-3"><LayoutTemplate size={30}/>Toque un elemento visual</p>
            )}
          </div>
          {audioFiles.length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 shadow-lg max-h-80 overflow-y-auto custom-scrollbar">
               <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 tracking-widest">Audios</h2>
               <div className="flex flex-col gap-3">
                 {audioFiles.map(af => (
                    <CustomAudioPlayer key={af.id} audioFile={af} onDelete={(id) => setAudioFiles(prev => prev.filter(a => a.id !== id))} onAttachBus={attachAudioToBus} />
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* POPUP DE CONFIRMACIÓN */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-sm w-full p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">¿Volver a grabar?</h3>
            <p className="text-sm text-gray-400 mb-6">Si vuelve a grabar, la grabación actual se perderá de forma permanente si no la ha descargado. ¿Está completamente seguro?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-md font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">Cancelar</button>
              <button onClick={() => { setRecordedVideoInfo(null); setShowResetConfirm(false); }} className="px-4 py-2 rounded-md font-medium bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg">Sí, borrar y repetir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
