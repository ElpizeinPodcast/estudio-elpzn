import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, StopCircle, Play, Image as ImageIcon, Trash2, 
  Download, Mic, MicOff, MonitorPlay, Video, VideoOff, 
  Upload, LayoutTemplate, Smartphone, Pause, FastForward, 
  Rewind, ArrowUp, ArrowDown, Volume2, Music, FlipHorizontal 
} from 'lucide-react';

/**
 * CustomAudioPlayer Component
 * Manages background audio tracks with volume and progress control.
 */
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

  const togglePlay = () => {
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  };

  return (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col gap-2 shadow-inner transition-all hover:border-gray-600">
      <audio id={audioFile.id} ref={audioRef} src={audioFile.url} loop className="hidden" />
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p className="text-[10px] text-gray-200 font-mono truncate">{audioFile.name}</p>
        </div>
        <button onClick={() => onDelete(audioFile.id)} className="text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={togglePlay} className="p-1.5 bg-lime-500 rounded-full text-gray-900 hover:bg-lime-400 transition-colors">
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <input 
          type="range" min="0" max="1" step="0.01" value={volume} 
          onChange={(e) => { audioRef.current.volume = e.target.value; setVolume(e.target.value); }}
          className="w-full h-1 accent-lime-500 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
        />
      </div>
    </div>
  );
};

/**
 * Main App Component
 * Handles the recording studio logic, canvas rendering, and media management.
 */
export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [canvasFormat, setCanvasFormat] = useState('horizontal');
  const [currentScene, setCurrentScene] = useState('1');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [elements, setElements] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Refs for consistent access in the drawing loop
  const elementsRef = useRef([]);
  const sceneRef = useRef('1');
  const formatRef = useRef('horizontal');

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { sceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { formatRef.current = canvasFormat; }, [canvasFormat]);

  /**
   * Main Drawing Loop
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    elementsRef.current.forEach(el => {
      if (el.scene !== sceneRef.current && el.scene !== 'todas') return;
      const layout = el.layouts[formatRef.current];
      if (!layout) return;

      ctx.save();
      if (el.type === 'camera' && videoRef.current?.readyState >= 2) {
        ctx.filter = 'brightness(0.9) contrast(1.1) saturate(1.1)';
        if (el.mirror) {
          ctx.translate(layout.x + layout.w, layout.y);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, layout.w, layout.h);
        } else {
          ctx.drawImage(videoRef.current, layout.x, layout.y, layout.w, layout.h);
        }
      } else if (el.type === 'image' && el.imgObj) {
        ctx.drawImage(el.imgObj, layout.x, layout.y, layout.w, layout.h);
      } else if (el.type === 'video' && el.vidObj?.readyState >= 2) {
        ctx.drawImage(el.vidObj, layout.x, layout.y, layout.w, layout.h);
      }
      ctx.restore();

      // Draw selection indicator
      if (el.id === selectedId && !isRecording) {
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 3;
        ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);
      }
    });

    requestAnimationFrame(draw);
  }, [selectedId, isRecording]);

  useEffect(() => {
    const anim = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim);
  }, [draw]);

  /**
   * Toggle User Camera
   */
  const toggleCamera = async () => {
    if (isVideoOn) {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      setElements(prev => prev.filter(e => e.type !== 'camera'));
      setIsVideoOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, frameRate: 60 } 
        });
        videoRef.current.srcObject = stream;
        setIsVideoOn(true);
        const newCam = {
          id: 'cam_1', type: 'camera', scene: 'todas', mirror: true,
          layouts: {
            horizontal: { x: 320, y: 180, w: 640, h: 360 },
            vertical: { x: 60, y: 400, w: 600, h: 480 }
          }
        };
        setElements(prev => [...prev, newCam]);
        setSelectedId('cam_1');
      } catch (err) { 
        console.error("Camera access error:", err);
      }
    }
  };

  /**
   * Handle Local File Uploads
   */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `el_${Date.now()}`;
    if (file.type.startsWith('image/')) {
      const img = new Image(); img.src = url;
      img.onload = () => {
        setElements(prev => [...prev, {
          id, type: 'image', scene: currentScene, imgObj: img,
          layouts: { horizontal: { x: 50, y: 50, w: 300, h: 200 }, vertical: { x: 50, y: 50, w: 300, h: 200 } }
        }]);
        setSelectedId(id);
      };
    } else if (file.type.startsWith('audio/')) {
      setAudioFiles(prev => [...prev, { id, url, name: file.name }]);
    }
  };

  /**
   * Start Canvas Recording
   */
  const startRecording = () => {
    recordedChunksRef.current = [];
    const stream = canvasRef.current.captureStream(60);
    mediaRecorderRef.current = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9', 
      videoBitsPerSecond: 5000000 
    });
    mediaRecorderRef.current.ondataavailable = (e) => { 
      if (e.data.size > 0) recordedChunksRef.current.push(e.data); 
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordedVideo(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shadow-xl">
        <div className="flex items-center gap-2">
          <MonitorPlay className="text-lime-400" />
          <h1 className="font-bold text-xl tracking-tight uppercase bg-gradient-to-r from-lime-400 to-green-500 bg-clip-text text-transparent">Estudio ELPZN</h1>
        </div>
        {isRecording && <div className="flex items-center gap-2 text-red-500 animate-pulse font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">GRABANDO</div>}
      </header>

      <main className="flex-1 flex flex-col xl:flex-row p-6 gap-6 max-w-[1800px] mx-auto w-full">
        {/* Left Column: Sources */}
        <div className="w-full xl:w-72 flex flex-col gap-4">
          <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest">Fuentes</h2>
            <div className="flex flex-col gap-2">
              <button onClick={toggleCamera} className={`flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-all ${isVideoOn ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-slate-800 hover:bg-slate-700'}`}>
                {isVideoOn ? <VideoOff size={18} /> : <Video size={18} />} {isVideoOn ? 'Apagar' : 'Cámara'}
              </button>
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold cursor-pointer border border-slate-700">
                <Upload size={18} /> Subir Medios
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </section>
          
          <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl mt-auto">
            {!isRecording ? (
              <button onClick={startRecording} className="w-full bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold p-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20">Iniciar</button>
            ) : (
              <button onClick={() => { mediaRecorderRef.current.stop(); setIsRecording(false); }} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold p-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">Detener</button>
            )}
          </section>
        </div>

        {/* Center Column: Canvas */}
        <div className="flex-1 flex flex-col gap-4 items-center">
          <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
            {['1', '2', '3', '4'].map(n => (
              <button key={n} onClick={() => {setCurrentScene(n); setSelectedId(null);}} className={`px-4 py-2 rounded-lg font-bold transition-all ${currentScene === n ? 'bg-lime-500 text-slate-900' : 'text-slate-400 hover:bg-slate-800'}`}>Escena {n}</button>
            ))}
          </div>
          <div className={`relative bg-black rounded-2xl shadow-2xl border border-slate-800 overflow-hidden ${canvasFormat === 'horizontal' ? 'w-full aspect-video' : 'h-[75vh] aspect-[9/16]'}`}>
            <canvas ref={canvasRef} width={canvasFormat === 'horizontal' ? 1280 : 720} height={canvasFormat === 'horizontal' ? 720 : 1280} className="w-full h-full object-contain" />
            <video ref={videoRef} className="hidden" autoPlay playsInline muted />
          </div>
          {recordedVideo && (
            <div className="flex gap-3 bg-slate-900 p-3 rounded-full border border-slate-800 shadow-xl">
              <a href={recordedVideo} download="estudio-elpzn.webm" className="flex items-center gap-2 px-6 py-2 bg-lime-500 text-slate-900 rounded-full font-bold hover:bg-lime-400"><Download size={18}/> Descargar Video</a>
            </div>
          )}
        </div>

        {/* Right Column: Audio Mixing */}
        <div className="w-full xl:w-80 flex flex-col gap-4">
          <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex-1 overflow-y-auto">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest">Pistas Audio</h2>
            <div className="flex flex-col gap-3">
              {audioFiles.map(af => (
                <CustomAudioPlayer key={af.id} audioFile={af} onDelete={(id) => setAudioFiles(prev => prev.filter(a => a.id !== id))} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
